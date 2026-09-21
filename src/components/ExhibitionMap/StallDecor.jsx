import React, {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Html, useGLTF, PositionalAudio } from "@react-three/drei";
import * as THREE from "three";

// Ecran plat texture avec une IMAGE (data URL).
function ImagePlane({ url, width, height, position }) {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (t) => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        setTex(t);
      },
      undefined,
      () => { /* image illisible : on n'affiche rien */ }
    );
    return () => { alive = false; };
  }, [url]);
  if (!tex) return null;
  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

// Ecran plat texture avec une VIDEO (data URL) : texture animee.
function VideoPlane({ url, width, height, position }) {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    if (!url) return;
    const v = document.createElement("video");
    v.src = url;
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    const t = new THREE.VideoTexture(v);
    t.colorSpace = THREE.SRGBColorSpace;
    setTex(t);
    return () => {
      try { v.pause(); } catch (e) { /* ignore */ }
    };
  }, [url]);
  if (!tex) return null;
  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// ASSETS 3D / INTERACTIFS IMPORTES PAR L'ADMINISTRATEUR
//
// Un asset est soit un modele glTF/GLB, soit une page web interactive. Un modele
// peut en plus porter une `interactUrl` : il devient cliquable et ouvre sa page.
// ---------------------------------------------------------------------------

// Garde-fou : un modele injoignable (URL morte, GLB corrompu) ne doit JAMAIS
// faire tomber tout le hall. Sans cette barriere, l'erreur du chargeur remonte
// au Suspense le plus proche et efface la scene entiere.
class AssetBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* modele illisible : on n'affiche simplement rien */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Modele glTF/GLB : ramene automatiquement a une hauteur cible et pose au sol.
// Les modeles importes ont des origines et des echelles arbitraires (de 0,01 a
// 100 unites) : sans ce recalage, la plupart apparaissent invisibles ou geants.
function FitModel({ url, target = 1.8 }) {
  const { scene } = useGLTF(url, "/draco/");
  // useGLTF met en cache l'objet : le meme modele utilise sur deux stands
  // partagerait le meme Object3D (le 2e parent vole le 1er). On clone.
  const obj = useMemo(() => scene.clone(true), [scene]);
  const inner = useRef();
  useLayoutEffect(() => {
    if (!inner.current) return;
    inner.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner.current);
    const h = box.max.y - box.min.y;
    if (!Number.isFinite(h) || h < 1e-4) return;
    inner.current.scale.setScalar(target / h);
    inner.current.updateWorldMatrix(true, true);
    const box2 = new THREE.Box3().setFromObject(inner.current);
    inner.current.position.y = -box2.min.y;
  }, [obj, target]);
  return (
    <group ref={inner}>
      <primitive object={obj} />
    </group>
  );
}

const badgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px",
  borderRadius: 999,
  border: "1px solid #22d3ee",
  background: "rgba(34,211,238,0.85)",
  color: "#04202a",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
  cursor: "pointer",
};

// Un modele 3D place sur le stand (position / rotation / echelle reglables).
function ModelAsset({ asset, onInteract }) {
  const { url, name, dx = 0, dz = 0, scale = 1, rotY = 0, interactUrl } = asset;
  const clickable = !!interactUrl;
  const open = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (clickable && onInteract) onInteract({ name: name || "Contenu interactif", url: interactUrl });
  };
  const hover = (on) => { document.body.style.cursor = on ? "pointer" : "auto"; };
  return (
    <group
      position={[dx, 0, dz]}
      rotation={[0, (rotY * Math.PI) / 180, 0]}
      scale={scale}
      onClick={clickable ? open : undefined}
      onPointerOver={clickable ? (e) => { e.stopPropagation(); hover(true); } : undefined}
      onPointerOut={clickable ? () => hover(false) : undefined}
    >
      <Suspense fallback={null}>
        <AssetBoundary>
          <FitModel url={url} target={1.8} />
        </AssetBoundary>
      </Suspense>
      {clickable && (
        <Html position={[0, 2.25, 0]} center distanceFactor={20} zIndexRange={[10, 0]}>
          <button onClick={open} title="Ouvrir le contenu interactif" style={badgeStyle}>
            ✨ {name || "Interactif"}
          </button>
        </Html>
      )}
    </group>
  );
}

// Un contenu purement interactif (page web) : un panneau cliquable dans le hall.
function InteractiveAsset({ asset, onInteract }) {
  const { name, url, dx = 0, dz = 0, scale = 1, rotY = 0 } = asset;
  const open = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onInteract) onInteract({ name: name || "Contenu interactif", url });
  };
  const hover = (on) => { document.body.style.cursor = on ? "pointer" : "auto"; };
  return (
    <group position={[dx, 0, dz]} rotation={[0, (rotY * Math.PI) / 180, 0]} scale={scale}>
      <mesh
        position={[0, 1.05, 0]}
        onClick={open}
        onPointerOver={(e) => { e.stopPropagation(); hover(true); }}
        onPointerOut={() => hover(false)}
      >
        <planeGeometry args={[1.6, 1.0]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#22d3ee"
          emissiveIntensity={0.4}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Html position={[0, 1.95, 0]} center distanceFactor={20} zIndexRange={[10, 0]}>
        <button onClick={open} title="Ouvrir le contenu interactif" style={badgeStyle}>
          ✨ {name || "Contenu interactif"}
        </button>
      </Html>
    </group>
  );
}

// ===========================================================================
// AUDIO 3D POSITIONNEL : un ecran (image/video) peut porter sa SORTIE AUDIO
// dans l espace (drei PositionalAudio, base sur THREE.PositionalAudio + Web
// Audio PannerNode). Le volume decroit avec la distance et le son est
// spatialise (stereo selon la position relative du visiteur).
// ===========================================================================
function PositionalScreenAudio({ url, distance, rolloff, volume, loop }) {
  return (
    <PositionalAudio
      url={url}
      autoplay
      loop={loop !== false}
      distance={typeof distance === "number" ? distance : 14}
      ref={(node) => {
        // Ajuste le volume et le modele d attenuation une fois charge.
        if (node && typeof node.setVolume === "function") {
          try {
            node.setVolume(typeof volume === "number" ? volume : 0.8);
            node.setDistanceModel("exponential");
            node.setRefDistance(3);
            if (typeof rolloff === "number") node.setRolloffFactor(rolloff);
          } catch (e) { /* audio indisponible */ }
        }
      }}
    />
  );
}

// Habillage 3D d'un stand (place DANS le groupe du stand) :
//  - ecran 2D (image ou video) devant le stand,
//  - kakemono (banniere verticale) sur le cote,
//  - anneau au sol materialisant la zone audio 3D,
//  - assets importes (modeles glTF/GLB et contenus interactifs).
export default function StallDecor({ decor, onInteract }) {
  if (!decor) return null;
  const d = decor.display;
  const k = decor.kakemono;
  const z = decor.audioZone;
  const assets = decor.assets || [];
  // Ecrans additionnels (playlist multi-ecrans) : meme format que display.
  const screens = Array.isArray(decor.screens) ? decor.screens : [];
  // Audio 3D positionnel : la sortie audio des medias du stand dans l espace.
  const audio3d = decor.audio3d || {};
  return (
    <group>
      {d && d.dataUrl && (
        d.kind === "video" ? (
          <VideoPlane url={d.dataUrl} width={2.8} height={1.7} position={[0, 2.0, 3.05]} />
        ) : (
          <ImagePlane url={d.dataUrl} width={2.8} height={1.7} position={[0, 2.0, 3.05]} />
        )
      )}
      {/* Ecrans supplementaires (playlists / multi-ecrans) */}
      {screens.map((s, i) =>
        s && s.url ? (
          s.kind === "video" ? (
            <VideoPlane key={"s" + i} url={s.url} width={s.width || 1.8} height={s.height || 1.1}
              position={[s.dx || 0, s.dy || 1.6, s.dz || 2.2]} />
          ) : (
            <ImagePlane key={"s" + i} url={s.url} width={s.width || 1.8} height={s.height || 1.1}
              position={[s.dx || 0, s.dy || 1.6, s.dz || 2.2]} />
          )
        ) : null
      )}
      {/* Sortie audio positionnelle du stand (liee aux zones cubiques du hall) */}
      {audio3d.enabled && audio3d.url && (
        <group position={[audio3d.dx || 0, 0, audio3d.dz || 0]}>
          <PositionalScreenAudio
            url={audio3d.url}
            distance={audio3d.distance || 14}
            rolloff={audio3d.rolloff || 1.4}
            volume={audio3d.volume || 0.8}
            loop={audio3d.loop !== false}
          />
        </group>
      )}
      {k && k.dataUrl && (
        <ImagePlane url={k.dataUrl} width={0.95} height={2.5} position={[2.35, 1.35, 2.4]} />
      )}
      {z && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[z.dx || 0, 0.07, z.dz || 0]}>
          <ringGeometry args={[Math.max(0.2, (z.r || 6) - 0.18), z.r || 6, 56]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
      {assets.map((a, i) =>
        a && a.kind === "interactive" ? (
          <InteractiveAsset key={a.id || i} asset={a} onInteract={onInteract} />
        ) : a && a.url ? (
          <ModelAsset key={a.id || i} asset={a} onInteract={onInteract} />
        ) : null
      )}
    </group>
  );
}
