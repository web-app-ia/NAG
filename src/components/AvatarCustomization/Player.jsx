import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useKeyboardControls, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import playerStore from "./playerStore";
import * as mp from "net/multiplayer";
import { liveBounds } from "net/hallConfig";
// Visites guidees : suivi automatique d un pair (follow mode).

// Couleurs de la pastille de statut (disponibilite) au-dessus de la tete.
const AVAIL = {
  online: "#22c55e",
  busy: "#ef4444",
  away: "#f59e0b",
  offline: "#94a3b8",
};
const availColor = (a) => AVAIL[a] || AVAIL.online;

// Vitesses de déplacement (unités / seconde).
// Avatar ~2.08 u de haut => ~1.2 hauteur/s = marche naturelle (~2.5 u/s).
const WALK_SPEED = 2.5;
const RUN_SPEED = 5;
// Demi-taille du sol de la salle (planeGeometry 80 x 40) -> on garde une marge.
const BOUND_X = 38;
const BOUND_Z = 18;
// Vitesse de rotation ANGULAIRE (rad/s) pour les touches gauche/droite.
const TURN_SPEED = 2.4;
// Compensation d'orientation : le modèle Mixamo fait face à +Z par défaut.
// Si l'avatar "marche à reculons", passer FACING_OFFSET à Math.PI.
const FACING_OFFSET = 0;
// Hauteur de caméra (TPS = au-dessus/epaule, FPS = hauteur des yeux).
// (avatar ~2.08 u de haut, tête ~1.9 u => yeux ~1.75)
const TPS_HEIGHT = 4;
const TPS_DISTANCE = 8;
const TPS_LOOK_AHEAD = 6;
const TPS_LOOK_HEIGHT = 2.6;
const FPS_EYE = 1.75;
// Souris (après un clic dans la scène) : regard / rotation.
const MOUSE_SENS = 0.0022; // radians par pixel
const PITCH_MIN = -1.15;
const PITCH_MAX = 1.15;
// Marche procédurale : rad de phase par unité parcourue.
// GAIT_K ≈ 2π / foulée(cycle) => les pieds ne patinent pas (phase liée à la
// distance, pas au temps) ; la cadence s'adapte marche/course automatiquement.
const GAIT_K = 3.3;
// Amplitude du rebond vertical du corps (unités monde).
const GAIT_BOB = 0.022;
// Rayon de collision de l'avatar (marge autour du corps, en unités monde).
const AVATAR_RADIUS = 0.45;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Vecteurs / quaternions temporaires (un seul Player à l'écran).
const _fwd = new THREE.Vector3();
const _move = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();
const _swing = new THREE.Quaternion();

// Axes de flexion LOCAUX réels du rig Mixamo (mesurés/vérifiés sur le GLB) :
// - jambes (UpLeg, genou, pied) : flexion avant/arrière = axe X local
// - bras  (bras, avant-bras)    : flexion avant/arrière = axe Z local (Y = twist)
// Appliquer une rotation sur le mauvais axe = articulations disgracieuses.
const AXIS_LEG = new THREE.Vector3(1, 0, 0);
const AXIS_ARM = new THREE.Vector3(0, 0, 1);

/**
 * Avatar contrôlable au clavier + souris, vue troisième personne (TPS) ou
 * première personne (FPS).
 * - Flèches gauche/droite (ou A/D) : rotation ANGULAIRE du corps (cap)
 * - Flèches haut/bas (ou W/S)      : avance/recule SELON le cap
 * - Clic dans la scène             : active la souris (verrouillage du pointeur)
 *                                    -> la souris fait aussi tourner le cap
 *                                    (horizontal) et incliner le regard (vertical)
 * - Shift                          : course
 * - V                              : bascule TPS <-> FPS
 * - ESC                            : libère la souris
 *
 * Animation : le GLB ne contient qu'un clip d'IDLE (jambes immobiles). On garde
 * ce clip (respiration) et on AJOUTE par-dessus une marche procédurale dont la
 * phase est liée à la distance parcourue (pas de patinage des pieds). Chaque os
 * tourne autour de SON axe de flexion réel => genoux/coudes/chevilles naturels.
 */
const Player = ({ model, collidersRef }) => {
  // Modele d avatar : banque de modeles (localStorage) sinon defaut.
  const avatarModel = model || (typeof localStorage !== "undefined" && localStorage.getItem("avatarModelUrl")) || "./avatars/attendeemaleavatar1.glb";
  const group = useRef();
  const inner = useRef(); // wrapper avatar (masqué en FPS)
  const viewMode = useRef("tps"); // "tps" | "fps"
  const heading = useRef(0); // cap angulaire du corps (rad)
  const pitch = useRef(-0.12); // inclinaison verticale du regard (rad)
  const gaitPhase = useRef(0); // phase du cycle de marche (rad)
  const gaitAmt = useRef(0); // 0 = immobile, 1 = en marche (lisse)
  const { nodes, materials, animations } = useGLTF(avatarModel, "/draco/");
  const { camera, gl } = useThree();
  const [, getKeys] = useKeyboardControls();
  const { actions, names } = useAnimations(animations, group);
  const actionRef = useRef(null);
  const groundYRef = useRef(0);

  // Etiquette de statut LOCALE (photo ronde + nom + disponibilite) au-dessus de
  // la tete du joueur courant. Re-rendue quand le profil change (photo/statut).
  const [self, setSelf] = useState(() => ({ ...mp.getSelfProfile() }));
  const [vMode, setVMode] = useState("tps");
  const lastVMode = useRef("tps");
  useEffect(() => mp.onSelfChange((p) => setSelf({ ...p })), []);

  // Lecture du clip d'origine (idle/respiration) : il tourne en permanence et
  // sert de pose de base sur laquelle on ajoute la marche.
  useEffect(() => {
    const a = actions[names[0]];
    if (a) {
      a.reset();
      a.enabled = true;
      a.setEffectiveWeight(1);
      a.setEffectiveTimeScale(1);
      a.play();
      actionRef.current = a;
    }
    return () => {
      if (a) a.stop();
    };
  }, [actions, names]);

  // Calage au sol (anti "enfonce dans le sol").
  useLayoutEffect(() => {
    if (!inner.current) return;
    inner.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner.current);
    if (Number.isFinite(box.min.y)) {
      groundYRef.current = -box.min.y;
      inner.current.position.y = groundYRef.current;
    }
  }, []);

  // Souris : clic dans la scène -> verrouillage du pointeur -> regard.
  // La souris et les touches modifient le MÊME cap (heading) ; la souris ajoute
  // en plus l'inclinaison verticale (pitch). ESC libère le pointeur.
  useEffect(() => {
    const el = gl.domElement;
    const onClick = () => {
      if (document.pointerLockElement !== el && el.requestPointerLock) {
        const p = el.requestPointerLock();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    };
    const onMove = (e) => {
      if (document.pointerLockElement !== el) return;
      heading.current -= e.movementX * MOUSE_SENS;
      pitch.current = clamp(
        pitch.current - e.movementY * MOUSE_SENS,
        PITCH_MIN,
        PITCH_MAX
      );
    };
    el.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
    };
  }, [gl]);

  // Bascule de vue TPS <-> FPS (touche V) + empêche le scroll de la page
  // quand on utilise les flèches/Espace. On laisse le comportement normal
  // dans les champs de saisie (INPUT/TEXTAREA).
  useEffect(() => {
    const GAME_KEYS = [
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space",
      "KeyW", "KeyA", "KeyS", "KeyD", "KeyV", "ShiftLeft", "ShiftRight",
    ];
    const onKey = (e) => {
      const t = e.target;
      const typing =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing) return;
      if (e.code === "KeyV") {
        viewMode.current = viewMode.current === "tps" ? "fps" : "tps";
      }
      if (GAME_KEYS.includes(e.code)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Applique une rotation sur l'axe LOCAL d'un os, PAR-DESSUS la pose courante
  // (celle écrite par le mixer). Le mixer réécrit chaque os chaque frame, donc
  // aucun cumul d'un frame à l'autre.
  const swing = (bone, axis, angle) => {
    if (bone && angle) bone.quaternion.multiply(_swing.setFromAxisAngle(axis, angle));
  };

  useFrame((state, delta) => {
    if (!group.current) return;

    // Mode de vue (TPS/FPS) change -> on rafraichit l'etat pour masquer
    // l'etiquette en FPS (sinon elle gene la camera).
    if (viewMode.current !== lastVMode.current) {
      lastVMode.current = viewMode.current;
      setVMode(viewMode.current);
    }

    // --- Teleportation demandee par le plan (ExhibitionMap) ---
    // On deplace l'avatar AVANT tout calcul. La boucle de collisions plus bas
    // ejecte automatiquement l'avatar si la destination tombait dans un stand.
    const tp = playerStore.consumeTeleport();
    if (tp) {
      group.current.position.x = tp.x;
      group.current.position.z = tp.z;
      if (typeof tp.heading === "number") heading.current = tp.heading;
    }

    const { forward, back, left, right, run } = getKeys();

    // --- Orientation ANGULAIRE commandée par les touches ---
    // Gauche/Droite font pivoter le cap ; Haut/Bas déplacent SELON le cap.
    if (left) heading.current += TURN_SPEED * delta;
    if (right) heading.current -= TURN_SPEED * delta;

    // Vecteur "devant" (horizontal) issu du cap.
    _fwd.set(Math.sin(heading.current), 0, Math.cos(heading.current));

    // Déplacement relatif au cap.
    _move.set(0, 0, 0);
    if (forward) _move.add(_fwd);
    if (back) _move.sub(_fwd);
    const moving = _move.lengthSq() > 0;
    const speed = run ? RUN_SPEED : WALK_SPEED;
    if (moving) {
      _move.normalize();
      group.current.position.addScaledVector(_move, speed * delta);
    }

    // --- Collisions : ne pas traverser les stands (AABB au sol) ---
    // Les AABB sont fournies par FitStall (empreinte réelle de chaque stand).
    const colliders = collidersRef && collidersRef.current;
    if (colliders) {
      const p = group.current.position;
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (!c) continue;
        // Point de l'AABB le plus proche de l'avatar (plan XZ, au sol).
        const nx = clamp(p.x, c.minX, c.maxX);
        const nz = clamp(p.z, c.minZ, c.maxZ);
        const dx = p.x - nx;
        const dz = p.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 < AVATAR_RADIUS * AVATAR_RADIUS) {
          if (d2 > 1e-8) {
            // Repousse hors de l'AABB (glissement naturel le long des faces).
            const d = Math.sqrt(d2);
            const push = (AVATAR_RADIUS - d) / d;
            p.x += dx * push;
            p.z += dz * push;
          } else {
            // Centre à l'intérieur : repousser par la face la plus proche.
            const dl = p.x - c.minX;
            const dr = c.maxX - p.x;
            const db = p.z - c.minZ;
            const df = c.maxZ - p.z;
            const m = Math.min(dl, dr, db, df);
            if (m === dl) p.x = c.minX - AVATAR_RADIUS;
            else if (m === dr) p.x = c.maxX + AVATAR_RADIUS;
            else if (m === db) p.z = c.minZ - AVATAR_RADIUS;
            else p.z = c.maxZ + AVATAR_RADIUS;
          }
        }
      }
    }

    // --- VISITE GUIDEe / FOLLOW MODE : si on suit un pair, on converge vers
    // lui en restant a ~2.2 m derriere (interrompt des qu on bouge a la main).
    const followId = playerStore.followId;
    if (followId) {
      const target = mp.getPeer(followId);
      if (target && (forward || back || left || right)) {
        playerStore.setFollow(null); // la marche manuelle annule le suivi
      } else if (target) {
        const dx = target.x - group.current.position.x;
        const dz = target.z - group.current.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 2.2) {
          const step = Math.min(0.08, dist * 0.05);
          group.current.position.x += (dx / dist) * step;
          group.current.position.z += (dz / dist) * step;
          const want = Math.atan2(dx, dz);
          let diff = want - heading.current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          heading.current += diff * 0.12;
        }
      } else {
        playerStore.setFollow(null); // pair disparu
      }
    }

    // Bornes de la salle (murs) : LUES A CHAQUE FRAME depuis la config du
    // Hall Builder (liveBounds) — la zone explorable suit la surface du sol
    // configurée (agrandissement/rétrécissement à chaud).
    group.current.position.x = clamp(group.current.position.x, -liveBounds.x, liveBounds.x);
    group.current.position.z = clamp(group.current.position.z, -liveBounds.z, liveBounds.z);

    // Le corps fait face au cap (orientation angulaire des touches/souris).
    group.current.rotation.y = heading.current + FACING_OFFSET;

    // --- Marche procédurale, ajoutée PAR-DESSUS le clip d'idle du mixer ---
    gaitAmt.current = THREE.MathUtils.lerp(
      gaitAmt.current,
      moving ? 1 : 0,
      1 - Math.exp(-delta * 9)
    );
    // La phase avance avec la DISTANCE parcourue (et non le temps) => les pieds
    // ne patinent pas ; la cadence s'adapte automatiquement marche/course.
    if (moving) gaitPhase.current += speed * delta * GAIT_K;

    const A = gaitAmt.current;
    if (A > 0.001) {
      const p = gaitPhase.current;
      const s = Math.sin(p);
      const c = Math.cos(p);

      // Jambes : balancier opposé (axe X local).
      swing(nodes.mixamorig12LeftUpLeg, AXIS_LEG, 0.6 * s * A);
      swing(nodes.mixamorig12RightUpLeg, AXIS_LEG, -0.6 * s * A);
      // Genoux : fléchissent pendant la phase de SWING (jambe qui se lève).
      swing(nodes.mixamorig12LeftLeg, AXIS_LEG, -(0.12 + 0.7 * Math.max(0, c)) * A);
      swing(nodes.mixamorig12RightLeg, AXIS_LEG, -(0.12 + 0.7 * Math.max(0, -c)) * A);
      // Chevilles : léger roulement du pied.
      swing(nodes.mixamorig12LeftFoot, AXIS_LEG, -0.2 * Math.sin(p + 0.8) * A);
      swing(
        nodes.mixamorig12RightFoot,
        AXIS_LEG,
        -0.2 * Math.sin(p + 0.8 + Math.PI) * A
      );

      // Bras : balancier OPPOSÉ aux jambes (axe Z local ; signes miroir G/D).
      swing(nodes.mixamorig12LeftArm, AXIS_ARM, -0.4 * s * A);
      swing(nodes.mixamorig12RightArm, AXIS_ARM, -0.4 * s * A);
      // Coudes : pli de base + léger balancement (le bras avant se plie plus).
      swing(nodes.mixamorig12LeftForeArm, AXIS_ARM, (0.3 - 0.15 * s) * A);
      swing(nodes.mixamorig12RightForeArm, AXIS_ARM, -(0.3 + 0.15 * s) * A);

      // Léger rebond vertical du corps (2x la fréquence des pas).
      if (inner.current) {
        const bob = GAIT_BOB * (1 - Math.cos(2 * p)) * 0.5 * A;
        inner.current.position.y = groundYRef.current + bob;
      }
    } else if (inner.current) {
      inner.current.position.y = groundYRef.current;
    }

    // --- Caméra : suit le cap dans les DEUX modes (+ inclinaison souris) ---
    const pos = group.current.position;
    const cp = Math.cos(pitch.current);
    const sp = Math.sin(pitch.current);
    if (viewMode.current === "fps") {
      // Première personne : caméra à la tête, le regard suit cap + pitch.
      camera.position.set(pos.x, pos.y + FPS_EYE, pos.z);
      _look.set(pos.x + _fwd.x * cp, pos.y + FPS_EYE + sp, pos.z + _fwd.z * cp);
      camera.lookAt(_look);
    } else {
      // Troisième personne : derrière le joueur selon le cap, hauteur fixe.
      _desired.set(
        pos.x - _fwd.x * TPS_DISTANCE,
        pos.y + TPS_HEIGHT,
        pos.z - _fwd.z * TPS_DISTANCE
      );
      camera.position.lerp(_desired, 1 - Math.exp(-delta * 6));
      _look.set(
        pos.x + _fwd.x * TPS_LOOK_AHEAD * cp,
        pos.y + TPS_LOOK_HEIGHT + TPS_LOOK_AHEAD * sp,
        pos.z + _fwd.z * TPS_LOOK_AHEAD * cp
      );
      camera.lookAt(_look);
    }

    // Avatar masqué en FPS (sinon on voit à l'intérieur de sa propre tête).
    if (inner.current) inner.current.visible = viewMode.current !== "fps";

    // Publie l'état du joueur pour l'interface 2D (plan, chat de proximité...).
    // Écriture directe dans un objet mutable : aucun re-rendu React par frame.
    playerStore.position.x = pos.x;
    playerStore.position.z = pos.z;
    playerStore.heading = heading.current;
    playerStore.viewMode = viewMode.current;
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* wrapper : avatar droit, au sol, à l'échelle 1.2.
          Le calage vertical exact au sol est corrigé par le useLayoutEffect. */}
      <group ref={inner} position={[0, 0, 0]} scale={[1.2, 1.2, 1.2]}>
        <group name="Scene">
          <group name="Armature" rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <primitive object={nodes.mixamorig12Hips} />
            <skinnedMesh
              name="Ch01_Body"
              geometry={nodes.Ch01_Body.geometry}
              material={materials.Ch01_body}
              skeleton={nodes.Ch01_Body.skeleton}
            />
            <skinnedMesh
              name="Ch01_Eyelashes"
              geometry={nodes.Ch01_Eyelashes.geometry}
              material={materials.Ch01_hair}
              skeleton={nodes.Ch01_Eyelashes.skeleton}
            />
            <skinnedMesh
              name="Ch01_Pants"
              geometry={nodes.Ch01_Pants.geometry}
              material={materials.Ch01_body}
              skeleton={nodes.Ch01_Pants.skeleton}
            />
            <skinnedMesh
              name="Ch01_Shirt"
              geometry={nodes.Ch01_Shirt.geometry}
              material={materials.Ch01_body}
              skeleton={nodes.Ch01_Shirt.skeleton}
            />
            <skinnedMesh
              name="Ch01_Sneakers"
              geometry={nodes.Ch01_Sneakers.geometry}
              material={materials.Ch01_body}
              skeleton={nodes.Ch01_Sneakers.skeleton}
            />
          </group>
        </group>
      </group>
      {/* Etiquette de statut LOCALE : photo ronde + nom + pastille de
          disponibilite. Masquee en FPS (camera a la tete du joueur). */}
      {self && vMode === "tps" && (
        <Html position={[0, 2.5, 0]} center distanceFactor={20} zIndexRange={[10, 0]}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 8px",
              borderRadius: 999,
              background: "rgba(11,16,32,0.82)",
              color: "#fff",
              fontSize: 12,
              whiteSpace: "nowrap",
              transform: "translateY(-6px)",
              pointerEvents: "none",
            }}
          >
            {self.photo ? (
              <img
                src={self.photo}
                alt=""
                style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: self.color || "#2563eb",
                  color: "#0b1020",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {(self.name || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span style={{ fontWeight: 600 }}>{self.name || "Vous"}</span>
            <span
              title={self.availability || "online"}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: availColor(self.availability),
                boxShadow: `0 0 6px ${availColor(self.availability)}`,
              }}
            />
          </div>
        </Html>
      )}
    </group>
  );
};

export default Player;

useGLTF.preload("./avatars/attendeemaleavatar1.glb", "/draco/");
