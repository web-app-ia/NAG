import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import * as mp from "net/multiplayer";

// Couleurs de la pastille de statut (disponibilite) au-dessus de la tete.
const AVAIL = {
  online: "#22c55e",
  busy: "#ef4444",
  away: "#f59e0b",
  offline: "#94a3b8",
};
const availColor = (a) => AVAIL[a] || AVAIL.online;

// Un avatar distant : capsule coloree + etiquette (photo ronde ou initiale, nom,
// statut). La position est lissee vers la derniere coordonnee connue (pas de
// scintillement). Lue dans useFrame directement depuis le module (objet vivant).
function RemoteAvatar({ id }) {
  const ref = useRef();
  const [, bump] = useState(0);

  // Re-rendre si le profil (nom/couleur/photo/statut) change.
  useEffect(() => mp.onPeersChange(() => bump((n) => n + 1)), []);

  useFrame((_, delta) => {
    const p = mp.getPeer(id);
    if (!p || !ref.current) return;
    const k = 1 - Math.exp(-delta * 8);
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, p.x, k);
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, p.z, k);
    ref.current.rotation.y = p.heading;
  });

  const p = mp.getPeer(id);
  if (!p) return null;
  const color = p.color || "#2563eb";
  const dot = availColor(p.availability);
  // Emote recente (diffusee via presence) : bulle au-dessus de la tete, 4 s.
  const emoteActive = p.emote && p.emoteTs && Date.now() - p.emoteTs < 4000;

  return (
    <group ref={ref}>
      {/* Corps (capsule) */}
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.45, 1.4, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Etiquette au-dessus de la tete : photo ronde (ou initiale) + nom + statut */}
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
          {p.photo ? (
            <img
              src={p.photo}
              alt=""
              style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: color,
                color: "#0b1020",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {(p.name || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <span style={{ fontWeight: 600 }}>{p.name || "Visiteur"}</span>
          <span
            title={p.availability || "online"}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: dot,
              boxShadow: `0 0 6px ${dot}`,
            }}
          />
        </div>
      </Html>
      {/* Bulle d emote (👋 / 👏 / 👍 / ❓) diffusee aux autres visiteurs */}
      {emoteActive && (
        <Html position={[0, 3.15, 0]} center distanceFactor={14} zIndexRange={[12, 0]}>
          <div className="ve-emote" style={{ fontSize: 30, textShadow: "0 2px 8px rgba(0,0,0,0.6)", pointerEvents: "none" }}>
            {p.emote}
          </div>
        </Html>
      )}
    </group>
  );
}

// Liste des avatars distants : ajoute/retire une capsule selon les connexions.
export default function RemotePlayers() {
  const [list, setList] = useState(() => mp.getPeers());
  useEffect(() => {
    const unsub = mp.onPeersChange(() => setList(mp.getPeers()));
    setList(mp.getPeers());
    return unsub;
  }, []);
  return (
    <>
      {list.map((p) => (
        <RemoteAvatar key={p.id} id={p.id} />
      ))}
    </>
  );
}
