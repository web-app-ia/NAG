import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { useLocation, useHistory, Route, Switch } from "react-router-dom";
import axios from "axios";
import { Canvas } from "@react-three/fiber";
import { Html, KeyboardControls, Environment, Lightformer, SoftShadows } from "@react-three/drei";
import { EffectComposer, Bloom, ToneMapping, Vignette, SMAA } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import AdminNavbar from "components/Navbars/AdminNavbar";
import Footer from "components/Footer/Footer";
import Sidebar from "components/Sidebar/Sidebar";
import { Card, Button, Alert, Badge, Row, Col, Modal } from "react-bootstrap";
import { StallCustomizationProvider } from "contexts/StallCustomizationContext";
import GoldStall from "components/StallCustomization/GoldStall";
import PlatinumStall from "components/StallCustomization/PlatinumStall";
import DiamondStall from "components/StallCustomization/DiamondStall";
import Player from "components/AvatarCustomization/Player";
import ExhibitionMap from "components/ExhibitionMap/ExhibitionMap";
import RemotePlayers from "components/ExhibitionMap/RemotePlayers";
import UnifiedControlBar from "components/ExhibitionMap/UnifiedControlBar";
import ProfilePanel from "components/ExhibitionMap/ProfilePanel";
import StallDecor from "components/ExhibitionMap/StallDecor";
import StallEditor from "components/ExhibitionMap/StallEditor";
import BotAvatars from "components/ExhibitionMap/BotAvatars";
import ConfiguredHall from "components/ExhibitionMap/ConfiguredHall";
import * as worlds from "net/worlds";
import playerStore from "components/AvatarCustomization/playerStore";
import * as hallConfigMod from "net/hallConfig";
import LeadForm from "components/ExhibitionMap/LeadForm";
import StallDocs from "components/ExhibitionMap/StallDocs";
import * as stallDecor from "net/stallDecor";
import * as voice from "net/proximityVoice";
import * as bots from "net/bots";
import * as mp from "net/multiplayer";
import { stallLayout, podColor } from "components/ExhibitionMap/hallLayout";
import routes from "routes.js";
import sidebarImage from "assets/img/sidebar-3.jpg";

// Position d un stand : position custom du monde (import de plan / drag&drop)
// sinon grille partagee de hallLayout. Niveau module : utilise par le hall ET la vue.
function stallPosFor(i, n, stallId, world) {
  const sp = world && world.standPositions && world.standPositions[stallId];
  if (sp) return [sp.x, sp.z];
  return stallLayout(i, n);
}

const authHeaders = () => ({
  headers: { Authorization: localStorage.getItem("jwt") || "" },
});

// Thème de la démo (utilisé quand l'API n'a pas encore de salon).
const THEME_NAME = "Salon de l'Innovation & de l'Art Numérique 2026";

// 20 participants thématiques (chute de secours si l'API ne répond pas).
// 20 stands ne tiennent pas en ligne sur un sol 80x40 : ils sont disposés
// en grille 5 colonnes x 4 rangées (voir ExhibitionHall -> layout()).
const DEMO_STALLS = [
  { stallId: "expo-01", stallName: "NovaLabs", stallType: "Diamond", tier: "Diamond", exhibitorEmail: "contact@novalabs.expo", description: "Studio de réalité virtuelle et installations immersives." },
  { stallId: "expo-02", stallName: "Chroma", stallType: "Gold", tier: "Gold", exhibitorEmail: "hello@chroma.expo", description: "Art génératif et projections mapping." },
  { stallId: "expo-03", stallName: "Quantum Forge", stallType: "Platinum", tier: "Platinum", exhibitorEmail: "team@quantumforge.expo", description: "Prototypage quantique et nouveaux matériaux." },
  { stallId: "expo-04", stallName: "Lumina", stallType: "Gold", tier: "Gold", exhibitorEmail: "bonjour@lumina.expo", description: "Lumières interactives et scénographie." },
  { stallId: "expo-05", stallName: "Pixel & Co", stallType: "Diamond", tier: "Diamond", exhibitorEmail: "hi@pixelco.expo", description: "Galerie d'art pixel et collections numériques." },
  { stallId: "expo-06", stallName: "SynthWave", stallType: "Gold", tier: "Gold", exhibitorEmail: "contact@synthwave.expo", description: "Musique générative et concerts virtuels." },
  { stallId: "expo-07", stallName: "BioFab", stallType: "Platinum", tier: "Platinum", exhibitorEmail: "lab@biofab.expo", description: "Bio-impression et matériaux durables." },
  { stallId: "expo-08", stallName: "NeuroArt", stallType: "Gold", tier: "Gold", exhibitorEmail: "neuro@neuroart.expo", description: "Art contrôlé par le cerveau (EEG)." },
  { stallId: "expo-09", stallName: "Aurora Studio", stallType: "Diamond", tier: "Diamond", exhibitorEmail: "studio@aurora.expo", description: "Aurores boréales numériques en direct." },
  { stallId: "expo-10", stallName: "RoboScope", stallType: "Gold", tier: "Gold", exhibitorEmail: "hello@roboscope.expo", description: "Robots compagnons et démonstrations." },
  { stallId: "expo-11", stallName: "Vertigo", stallType: "Platinum", tier: "Platinum", exhibitorEmail: "contact@vertigo.expo", description: "Expériences VR de voltige." },
  { stallId: "expo-12", stallName: "DataBloom", stallType: "Gold", tier: "Gold", exhibitorEmail: "bloom@databloom.expo", description: "Visualisation de données vivante." },
  { stallId: "expo-13", stallName: "EchoLab", stallType: "Diamond", tier: "Diamond", exhibitorEmail: "echo@echolab.expo", description: "Son spatialisé et acoustique expérimentale." },
  { stallId: "expo-14", stallName: "MaskMaker", stallType: "Gold", tier: "Gold", exhibitorEmail: "hello@maskmaker.expo", description: "Masques en réalité augmentée et filtres." },
  { stallId: "expo-15", stallName: "Fusion", stallType: "Platinum", tier: "Platinum", exhibitorEmail: "fusion@fusion.expo", description: "Énergie propre et démonstrations." },
  { stallId: "expo-16", stallName: "Kinetik", stallType: "Gold", tier: "Gold", exhibitorEmail: "contact@kinetik.expo", description: "Sculptures cinétiques et mobiles." },
  { stallId: "expo-17", stallName: "Holo", stallType: "Diamond", tier: "Diamond", exhibitorEmail: "holo@holo.expo", description: "Hologrammes et téléprésence." },
  { stallId: "expo-18", stallName: "Garden3D", stallType: "Gold", tier: "Gold", exhibitorEmail: "garden@garden3d.expo", description: "Jardins procéduraux et écosystèmes." },
  { stallId: "expo-19", stallName: "Cipher", stallType: "Platinum", tier: "Platinum", exhibitorEmail: "cipher@cipher.expo", description: "Cybersécurité ludique et escape games." },
  { stallId: "expo-20", stallName: "Stellar", stallType: "Gold", tier: "Gold", exhibitorEmail: "hi@stellar.expo", description: "Exploration spatiale et systèmes solaires." },
];

// Cartographie des touches du contrôleur clavier de l'avatar.
const KEY_MAP = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "back", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];

// Calage automatique de chaque stand au sol et à une taille homogène.
// Les modèles de l'auteur sont de grands stands (plusieurs mètres) avec des
// origines différentes : on mesure leur boîte englobante à la volée et on
// les remet à l'échelle + on les pose sur le sol (y = 0) pour un hall net.
function FitStall({ stallType, target = 5.5, onFit }) {
  const inner = useRef();
  const type = (stallType || "Gold").toLowerCase();
  useLayoutEffect(() => {
    if (!inner.current) return;
    inner.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner.current);
    if (!Number.isFinite(box.min.y) || !Number.isFinite(box.max.y)) return;
    const size = Math.max(
      box.max.x - box.min.x,
      box.max.y - box.min.y,
      box.max.z - box.min.z
    );
    if (size > 1e-3) {
      const s = target / size;
      inner.current.scale.setScalar(s);
      inner.current.updateWorldMatrix(true, true);
      const box2 = new THREE.Box3().setFromObject(inner.current);
      inner.current.position.y = -box2.min.y;
      // Signale l'empreinte au sol (AABB en coordonnees monde) pour les collisions.
      if (onFit) onFit(box2.min.x, box2.max.x, box2.min.z, box2.max.z);
    }
  }, [type, target]);
  let content = null;
  if (type === "platinum") content = <PlatinumStall />;
  else if (type === "diamond") content = <DiamondStall />;
  else content = <GoldStall />;
  return <group ref={inner}>{content}</group>;
}

// podColor() vient desormais de components/ExhibitionMap/hallLayout :
// la scene 3D et le plan 2D doivent partager la meme source de verite.

// Murs de fond pour que la scène lise comme une salle fermée (et non des
// modèles flottant sur un plan).
function HallWalls() {
  const Wall = ({ position, rotation, args }) => (
    <mesh position={position} rotation={rotation} receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#11182f" roughness={1} metalness={0} />
    </mesh>
  );
  return (
    <group>
      <Wall position={[0, 6, -20]} args={[80, 12, 0.5]} />
      <Wall position={[0, 6, 20]} args={[80, 12, 0.5]} />
      <Wall position={[-40, 6, 0]} rotation={[0, Math.PI / 2, 0]} args={[40, 12, 0.5]} />
      <Wall position={[40, 6, 0]} rotation={[0, Math.PI / 2, 0]} args={[40, 12, 0.5]} />
    </group>
  );
}

function ExhibitionHall({ stalls, selectedId, onSelect, decorByStall, onInteract, world, onEnterDoor }) {
  // Empreintes au sol des stands (remplies par FitStall) -> collisions.
  const collidersRef = useRef([]);
  // Grille 5 colonnes x 4 rangées : calculée par hallLayout, PARTAGÉE avec le
  // plan 2D (ExhibitionMap). Une seule source de vérité => le plan ne peut pas
  // se désynchroniser du rendu 3D.
  return (
    <>
      <color attach="background" args={["#0b1020"]} />
      {/* Ombres douces (PCSS) : remplace les ombres dures par defaut pour un rendu realiste */}
      <SoftShadows size={25} samples={16} focus={0.85} />
      {/* Eclairage image-based (IBL) procedurale via Lightformers : reflets sans reseau */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2} position={[0, 6, -12]} scale={[12, 12, 1]} color="#cfe3ff" />
        <Lightformer intensity={1.2} position={[12, 6, 0]} scale={[10, 10, 1]} rotation-y={Math.PI / 2} color="#ffffff" />
        <Lightformer intensity={1.2} position={[-12, 6, 0]} scale={[10, 10, 1]} rotation-y={-Math.PI / 2} color="#ffd9c2" />
        <Lightformer intensity={1.6} position={[0, 12, 0]} scale={[12, 12, 1]} rotation-x={Math.PI / 2} color="#ffffff" />
      </Environment>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[10, 14, 8]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
      />
      {/* Avatar contrôlable au clavier (vue troisième personne, caméra qui suit) */}
      <Player collidersRef={collidersRef} />
      {/* Autres visiteurs (multijoueur temps reel) : capsules + etiquettes */}
      <RemotePlayers />
      {/* Bots 3D (menu admin) : assistants du hall connectes a des API externes */}
      <BotAvatars />
      {/* Sol / allee / murs / plafond / grille / objets / zones audio cubiques :
          rendus depuis la configuration du Hall Builder (fallback geometrie
          historique quand aucune config admin n existe). */}
      <ConfiguredHall onInteract={onInteract} world={world} onEnterDoor={onEnterDoor} />
      {stalls.map((stall, i) => {
        const [x, z] = stallPosFor(i, stalls.length, stall.stallId, world);
        const selected = stall.stallId === selectedId;
        const t = stall.stallType || stall.tier;
        return (
          <group key={stall.stallId || i} position={[x, 0, z]}>
            {/* Plateforme (pod) qui ancrage visuellement le stand au sol */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
              <circleGeometry args={[4.2, 48]} />
              <meshStandardMaterial color={podColor(t)} roughness={0.85} metalness={0.1} />
            </mesh>
            <Suspense fallback={null}>
              <FitStall
                stallType={t}
                target={5.5}
                onFit={(minX, maxX, minZ, maxZ) => {
                  collidersRef.current[i] = { minX, maxX, minZ, maxZ };
                }}
              />
            </Suspense>
            {/* Habillage du stand (menu admin) : visuel 2D, kakemono, zone audio 3D,
                et assets 3D/interactifs importes (modeles glTF + pages web) */}
            <StallDecor
              decor={decorByStall ? decorByStall[stall.stallId] : null}
              onInteract={onInteract}
            />
            <Html position={[0, 5.6, 0]} center distanceFactor={20}>
              <div
                onClick={() => onSelect(stall)}
                style={{
                  cursor: "pointer",
                  background: selected ? "#0d6efd" : "rgba(0,0,0,0.65)",
                  color: "#fff",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  border: selected ? "2px solid #fff" : "1px solid #888",
                }}
              >
                {stall.stallName || stall.stallId} ({t || "Standard"})
              </div>
            </Html>
            {selected && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[4.5, 5.0, 48]} />
                <meshBasicMaterial color="#0d6efd" side={2} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function VisitExhibition() {
  const location = useLocation();
  const history = useHistory();
  const mainPanel = React.useRef(null);
  const [image, setImage] = React.useState(sidebarImage);
  const [color, setColor] = React.useState("black");
  const [hasImage, setHasImage] = React.useState(true);
  const [immersive, setImmersive] = React.useState(false); // mode plein ecran : sans sidebar ni navbar
  // --- MONDES MODULAIRES (portes/portails) ---
  const [world, setWorld] = React.useState(null);          // monde courant
  const [transition, setTransition] = React.useState(null); // {label} overlay de chargement
  const [leadStall, setLeadStall] = React.useState(null);   // stand pour le formulaire lead
  // Id d'exposition au niveau composant (utilise par LeadForm, hors useEffect).
  const leadExhibitionId =
    (location.state && location.state.exhibitionId) ||
    localStorage.getItem("visitExhibitionId") ||
    localStorage.getItem("exhibitionId") ||
    "";
  const [exhibition, setExhibition] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [selectedStall, setSelectedStall] = useState(null);
  const [loading, setLoading] = useState(true);
  // Plan du salon (vue de dessus) : permet d'aller directement a un stand,
  // une zone ou un point quelconque du hall.
  // ?map=1 dans l'URL ouvre le plan directement (lien partageable).
  const [showMap, setShowMap] = useState(
    () => new URLSearchParams(window.location.search).get("map") === "1"
  );
  // Habillage des stands (menu admin) : visuel 2D + kakemono + zone audio 3D.
  const [decorByStall, setDecorByStall] = useState({});
  const [editingStall, setEditingStall] = useState(null);
  // Contenu interactif ouvert depuis un asset de stand : { name, url }.
  const [interactive, setInteractive] = useState(null);
  useEffect(() => {
    stallDecor.loadAll();
    return stallDecor.onChange((m) => setDecorByStall({ ...m }));
  }, []);
  // Bots 3D du hall (assistants connectes a des API externes) : liste chargee
  // une fois depuis le serveur, puis rendue dans la scene (BotAvatars).
  useEffect(() => {
    bots.loadBots();
  }, []);
  // --- MONDES MODULAIRES : chargement + entree/sortie de portail ---
  React.useEffect(() => {
    let alive = true;
    worlds.load().then(() => {
      if (!alive) return;
      const w = worlds.getCurrentWorld();
      setWorld(w);
      applyWorldBounds(w);
    });
    const unsub = worlds.onChange(() => setWorld(worlds.getCurrentWorld()));
    return () => { alive = false; unsub(); };
  }, []);

  // Bornes d exploration du monde courant (suit la surface du monde).
  const applyWorldBounds = (w) => {
    if (!w || !w.floor) return;
    hallConfigMod.setLiveBounds((w.floor.sizeX || 80) / 2 - 2, (w.floor.sizeZ || 40) / 2 - 2);
  };

  // Franchissement d une porte : fondu -> changement de monde -> spawn.
  const enterDoor = (door) => {
    if (!door) return;
    setTransition({ label: door.label || door.targetWorldId });
    setTimeout(() => {
      const target = worlds.getWorld(door.targetWorldId);
      worlds.setCurrentWorld(door.targetWorldId);
      applyWorldBounds(target);
      // Spawn au point prevu par la porte (sinon centre).
      playerStore.requestTeleport(
        typeof door.spawnX === "number" ? door.spawnX : 0,
        typeof door.spawnZ === "number" ? door.spawnZ : 0,
        typeof door.spawnHeading === "number" ? door.spawnHeading : 0
      );
      setTimeout(() => setTransition(null), 500);
    }, 700); // laisse le fondu couvrir le chargement
  };


  // Beat de proximite : annonce le stand le plus proche (dwell time admin).
  React.useEffect(() => {
    const t = setInterval(() => {
      if (!stalls.length) return;
      const me = playerStore.position;
      let best = null, bestD = Infinity;
      stalls.forEach((s, i) => {
        const [x, z] = stallPosFor(i, stalls.length, s.stallId, world);
        const d = Math.hypot(me.x - x, me.z - z);
        if (d < bestD) { bestD = d; best = s; }
      });
      if (best && bestD < 12) mp.updatePresence({ nearStallId: best.stallId });
      else mp.updatePresence({ nearStallId: "" });
    }, 5000);
    return () => clearInterval(t);
  }, [stalls, world]);

  // Emotes : touches 1-4 (bulle au-dessus de la tete, diffusee aux pairs).
  React.useEffect(() => {
    const EMOTES = { "1": "👋", "2": "👏", "3": "👍", "4": "❓" };
    const onKey = (e) => {
      if (e.target && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      const em = EMOTES[e.key];
      if (em) mp.updatePresence({ emote: em, emoteTs: Date.now() });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Zones audio 3D des stands (coordonnees monde) -> voix de proximite.
  useEffect(() => {
    const list = [];
    stalls.forEach((s, i) => {
      const dec = decorByStall[s.stallId];
      if (dec && dec.audioZone) {
        const [x, z] = stallPosFor(i, stalls.length, s.stallId, world);
        list.push({
          x: x + (dec.audioZone.dx || 0),
          z: z + (dec.audioZone.dz || 0),
          r: dec.audioZone.r || 6,
        });
      }
    });
    voice.setZones(list);
  }, [decorByStall, stalls]);

  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/admin") {
        return (
          <Route
            path={prop.layout + prop.path}
            render={(props) => <prop.component {...props} />}
            key={key}
          />
        );
      } else {
        return null;
      }
    });
  };

  useEffect(() => {
    const stateId = location.state && location.state.exhibitionId;
    if (stateId) localStorage.setItem("visitExhibitionId", stateId);
    const targetId = stateId || localStorage.getItem("visitExhibitionId") || "";

    const load = async () => {
      try {
        const exRes = await axios.get(
          "http://localhost:8080/api/exhibitions",
          authHeaders()
        );
        const list = exRes.data || [];
        const current =
          list.find((e) => e.id === targetId) ||
          list.find((e) => e.started) ||
          list[0] ||
          null;
        setExhibition(current);

        let stallList = [];
        try {
          const stRes = await axios.get(
            "http://localhost:8080/api/stalls",
            authHeaders()
          );
          const all = stRes.data || [];
          stallList = current
            ? all.filter((s) => s.exhibitionId === current.id)
            : all;
          if (stallList.length === 0) stallList = all;
        } catch (e) {
        }
        setStalls(stallList.length > 0 ? stallList : DEMO_STALLS);
      } catch (e) {
        // API injoignable : on retombe sur la demo. Sans cela, `stalls` restait
        // vide et le hall 3D comme le plan s'affichaient sans aucun stand.
        setStalls(DEMO_STALLS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Connexion au multijoueur temps reel (presence des avatars + chat de proximite).
  // Le nom affiche est derive de l'email connecte (localStorage), puis complete
  // par le profil enregistre (veProfile : nom personnalise, photo, disponibilite).
  useEffect(() => {
    const email = localStorage.getItem("email") || "attendee@example.com";
    const local = (email.split("@")[0] || "invite").replace(/[._-]+/g, " ");
    const derivedName = local.replace(/\b\w/g, (c) => c.toUpperCase()) || "Invité";
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem("veProfile") || "{}");
    } catch (e) {
      stored = {};
    }
    const name = stored.name || derivedName;
    const color = stored.color || "#2563eb";
    const photo = stored.photo || "";
    const availability = stored.availability || "online";
    mp.connect({ name, color, photo, availability });
    return () => mp.disconnect();
  }, []);

  // Synchronise le mode immersif avec l'etat fullscreen du document.
  // En immersif, on ajoute une classe au <body> pour neutraliser les styles du
  // template (fond blanc, padding du .main-panel, etc.) qui creeraient une
  // bande blanche sous le canvas.
  React.useEffect(() => {
    const onFs = () => {
      const fs = !!document.fullscreenElement;
      setImmersive(fs);
      document.body.classList.toggle("ve-immersive", fs);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.body.classList.remove("ve-immersive");
    };
  }, []);

  return (
    <>
      <div className="wrapper">
        {!immersive && <Sidebar color={color} image={hasImage ? image : ""} routes={routes} />}
        <div
          className="main-panel"
          ref={mainPanel}
          style={immersive ? { marginLeft: 0, width: "100%", minHeight: "100vh" } : { marginLeft: 280 }}
        >
          {!immersive && <AdminNavbar />}
          <div className="container-fluid" style={immersive ? { padding: 0, margin: 0 } : undefined}>
            <Switch>{getRoutes(routes)}</Switch>
            {/* En-tete (titre + aide) : uniquement hors mode immersif */}
            {!immersive && (
            <Card className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <div>
                    <h4 className="m-0">
                      {exhibition ? exhibition.exhibitionName : THEME_NAME}
                    </h4>
                    <small className="text-muted">
                      {exhibition ? exhibition.description : "20 participants — démo de marche de l'avatar"}
                    </small>
                  </div>
                  <div>
                    {exhibition && (
                      <Badge bg={exhibition.started ? "success" : "warning"} className="mr-2">
                        {exhibition.started ? "Running / Live" : "Not started"}
                      </Badge>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => history.push("/admin/exhibitions")}
                    >
                      Back to Exhibitions
                    </Button>
                  </div>
                </div>
                <hr />
                <Alert variant="info" className="mb-0">
                  <strong>Cliquez dans la scène</strong> pour activer la souris
                  (regard). <strong>←/→</strong> (ou A/D) font pivoter le corps,{" "}
                  <strong>↑/↓</strong> (ou W/S) avancent/reculent selon le cap.
                  Maintenez <strong>Shift</strong> pour courir. Touche{" "}
                  <strong>V</strong> pour basculer la vue (TPS troisième personne
                  / FPS première personne). <strong>ESC</strong> libère la souris.
                  Cliquez un label de stand pour le sélectionner. Le bouton{" "}
                  <strong>Plan du salon</strong> ouvre la vue de dessus : cliquez
                  un stand, une zone ou n'importe quel point pour vous y
                  téléporter instantanément. Le <strong>chat de proximité</strong>{" "}
                  (en bas à droite) ne reçoit que les messages des visiteurs
                  proches de votre avatar. Cliquez sur un <strong>bot 3D</strong>{" "}
                  (orbe violet 🤖) pour lui parler en texte ou à la voix : il peut
                  répondre, parler et afficher des boutons de téléportation.
                </Alert>
              </Card.Body>
            </Card>
            )}
            {loading ? (
              <div className="text-center py-4">Loading 3D hall...</div>
            ) : (
              <Row style={immersive ? { margin: 0 } : undefined} className={immersive ? "no-gutters" : undefined}>
                <Col lg={showMap && !immersive ? 8 : 12} style={immersive ? { padding: 0 } : undefined}>
                  <StallCustomizationProvider>
                    <Canvas
                      shadows
                      camera={{ position: [0, 7, 18], fov: 50 }}
                      gl={{ toneMapping: THREE.NoToneMapping, antialias: false }}
                      style={immersive ? { height: "100vh", width: "100vw", borderRadius: 0 } : { height: "65vh", borderRadius: "8px" }}
                    >
                      <KeyboardControls map={KEY_MAP}>
                        <Suspense fallback={null}>
                          <ExhibitionHall
                            stalls={stalls}
                            selectedId={selectedStall && selectedStall.stallId}
                            onSelect={setSelectedStall}
                            decorByStall={decorByStall}
                            onInteract={setInteractive}
                            world={world}
                            onEnterDoor={enterDoor}
                          />
                        </Suspense>
                        {/* Post-traitement : bloom + tone mapping ACES + vignette + AA (SMAA) */}
                        <EffectComposer>
                          <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.6} />
                          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
                          <Vignette eskil={false} offset={0.25} darkness={0.7} />
                          <SMAA />
                        </EffectComposer>
                      </KeyboardControls>
                    </Canvas>
                  </StallCustomizationProvider>
                </Col>
                {showMap && !immersive && (
                  <Col lg={4} className="mb-3">
                    <ExhibitionMap
                      stalls={stalls}
                      selectedId={selectedStall && selectedStall.stallId}
                      onSelect={setSelectedStall}
                    />
                  </Col>
                )}
              </Row>
            )}
            {selectedStall && !immersive && (
              <Card className="mt-3">
                <Card.Body>
                  <h5>{selectedStall.stallName || selectedStall.stallId}</h5>
                  <p className="mb-1">
                    <strong>Type:</strong> {selectedStall.stallType || selectedStall.tier || "Standard"}
                  </p>
                  <p className="mb-1">
                    <strong>Description:</strong> {selectedStall.description || "—"}
                  </p>
                  <p className="mb-0">
                    <strong>Exhibitor:</strong> {selectedStall.exhibitorEmail || "—"}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2 mr-2"
                    onClick={() => setLeadStall(selectedStall)}
                  >
                    Laisser mes coordonnees
                  </Button>
                  <StallDocs stallId={selectedStall.stallId} />                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="mt-2"
                    onClick={() => setEditingStall(selectedStall)}
                  >
                    Éditer ce stand (habillage)
                  </Button>
                </Card.Body>
              </Card>
            )}
          </div>
          {!immersive && <Footer />}
        </div>
      </div>
      {/* Barre de controle unifiee : chat proximite + conversations privees + bot,
          micro, sortie audio, plein ecran, quitter. */}
      <UnifiedControlBar
        showMap={showMap}
        onToggleMap={() => setShowMap((v) => !v)}
        onExit={() => {
          try { voice.stopVoice(); } catch (e) { /* ignore */ }
          try { mp.disconnect(); } catch (e) { /* ignore */ }
          history.push("/admin/exhibitions");
        }}
      />
      {/* Plan du salon en overlay (mode immersif / plein ecran) */}
      {immersive && showMap && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            width: 340,
            maxWidth: "40vw",
            maxHeight: "70vh",
            overflowY: "auto",
            zIndex: 1055,
            background: "rgba(11,16,32,0.95)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            padding: 8,
          }}
        >
          <ExhibitionMap
            stalls={stalls}
            selectedId={selectedStall && selectedStall.stallId}
            onSelect={setSelectedStall}
          />
        </div>
      )}
      {/* Formulaire de collecte de leads (coordonnees visiteur -> exposant) */}
      <LeadForm
        stall={leadStall}
        exhibitionId={leadExhibitionId}
        show={!!leadStall}
        onHide={() => setLeadStall(null)}
      />
      {/* Badge du monde courant (univers modulaire) */}
      {world && (
        <div style={{
          position: "fixed", top: 12, left: immersive ? 12 : 300, zIndex: 1055,
          background: "rgba(11,16,32,0.9)", border: "1px solid #22d3ee",
          color: "#e0f7fa", borderRadius: 10, padding: "4px 12px", fontSize: 12,
        }}>
          🏛️ {world.name}
        </div>
      )}
      {/* Overlay de transition entre univers (portes/portails) */}
      {transition && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 4000,
          background: "radial-gradient(circle at 50% 50%, rgba(11,16,32,0.92), #000)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", color: "#e0f7fa",
          animation: "veFade 0.7s ease",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{transition.label}</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}>Chargement de l univers…</div>
        </div>
      )}      {/* Profil (photo ronde au-dessus de la tete + disponibilite) */}
      <ProfilePanel />
      {/* Habillage de stand (menu admin) : modèle + visuel 2D + kakemono + zone audio */}
      <StallEditor
        stall={editingStall}
        show={!!editingStall}
        onHide={() => setEditingStall(null)}
      />
      {/* Visionneuse d'un asset interactif de stand (ouvert depuis le hall 3D) */}
      <Modal
        show={!!interactive}
        onHide={() => setInteractive(null)}
        centered
        size="xl"
        dialogClassName="mw-100"
        style={{ zIndex: 1060 }}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {interactive ? interactive.name : ""}
            <span className="text-muted small ml-2">contenu interactif du stand</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {interactive && (
            <iframe
              key={interactive.url}
              src={interactive.url}
              title={interactive.name || "Contenu interactif"}
              style={{ width: "100%", height: "72vh", border: 0, display: "block" }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              allow="camera; microphone; fullscreen; autoplay; clipboard-write"
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <small className="text-muted mr-auto">
            Certains sites refusent de s'afficher dans un cadre : ouvrez-les
            dans un nouvel onglet.
          </small>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => {
              if (interactive) window.open(interactive.url, "_blank", "noopener");
            }}
          >
            Ouvrir dans un onglet
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setInteractive(null)}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default VisitExhibition;
