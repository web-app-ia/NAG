import React, { Suspense, useMemo } from "react";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import * as hallConfig from "../../net/hallConfig";
import DoorPortal from "./DoorPortal";
import { useHallConfig } from "./useHallConfig";

// ===========================================================================
// HALL CONFIGURE : sol / murs / plafond / grille / objets / zones audio
// Cubiques. Remplace le HallWalls + sol fixes de VisitExhibition quand une
// configuration existe. Les murs sont rendus en FrontSide (invisibles depuis
// l exterieur) si walls.invisibleForTPS est actif.
// ===========================================================================

class ObjBoundary extends React.Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* modele illisible */ }
  render() { return this.state.failed ? null : this.props.children; }
}

function PlacedModel({ url, x, y, z, scale, rotY }) {
  const { scene } = useGLTF(url, "/draco/");
  const obj = useMemo(() => scene.clone(true), [scene]);
  // Recalage : pose au sol (origine du modele -> y) et echelle cible 1 unite.
  React.useLayoutEffect(() => {
    try {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = scale / maxDim;
      obj.scale.setScalar(s);
      obj.position.y = y + (size.y * s) / 2;
      obj.rotation.y = (rotY * Math.PI) / 180;
      obj.position.x = x;
      obj.position.z = z;
    } catch (e) { /* ignore */ }
  }, [obj, x, y, z, scale, rotY]);
  return <primitive object={obj} />;
}

// Paysage importe (GLB d un logiciel 3D type Blender/SketchUp) : normalise a
// la surface du monde (le modele est recentre et etire sur le perimetre).
function FitLandscape({ url, sizeX, sizeZ }) {
  const { scene } = useGLTF(url, "/draco/");
  const obj = useMemo(() => scene.clone(true), [scene]);
  React.useLayoutEffect(() => {
    try {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const sx = size.x || 1, sz = size.z || 1;
      // Ajuste l echelle pour que l empreinte au sol remplisse le perimetre.
      const s = Math.min(sizeX / sx, sizeZ / sz);
      obj.scale.setScalar(s);
      const center = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
      obj.position.set(-center.x, -box.min.y * s, -center.z);
    } catch (e) { /* modele illisible */ }
  }, [obj, sizeX, sizeZ]);
  return <primitive object={obj} />;
}

// Zone audio cubique : cube semi-transparent (fil de fer + faces).
function AudioZoneBox({ z, i }) {
  const color = z.sourceStallId ? "#22d3ee" : "#a78bfa";
  return (
    <group position={[z.x, z.y + z.sizeY / 2, z.z]}>
      <mesh>
        <boxGeometry args={[z.sizeX, z.sizeY, z.sizeZ]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.07}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[z.sizeX, z.sizeY, z.sizeZ]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.35} />
      </mesh>
      {z.name && (
        <Html position={[0, z.sizeY / 2 + 0.6, 0]} center distanceFactor={30} zIndexRange={[8, 0]}>
          <div style={{
            background: "rgba(11,16,32,0.85)",
            color, fontSize: 11, padding: "2px 8px",
            borderRadius: 6, border: `1px solid ${color}`,
            whiteSpace: "nowrap",
          }}>
            🔊 {z.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// Grille de quadrillage (lignes par pas).
function GridHelper({ sizeX, sizeZ, step }) {
  const gx = Math.ceil(sizeX / 2 / step);
  const gz = Math.ceil(sizeZ / 2 / step);
  const lines = [];
  for (let i = -gx; i <= gx; i++) {
    lines.push([i * step, -sizeZ / 2, i * step, sizeZ / 2]);
  }
  for (let j = -gz; j <= gz; j++) {
    lines.push([-sizeX / 2, j * step, sizeX / 2, j * step]);
  }
  return (
    <group position={[0, 0.02, 0]}>
      {lines.map(([x1, z1, x2, z2], i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[new Float32Array([x1, 0, z1, x2, 0, z2]), 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#334155" transparent opacity={0.4} />
        </line>
      ))}
    </group>
  );
}

export default function ConfiguredHall({ onInteract, world, onEnterDoor }) {
  const cfg0 = useHallConfig();
  // En mode monde modulaire, floor/walls proviennent du monde ; sinon config globale.
  const cfg = world
    ? { ...cfg0, floor: { ...cfg0.floor, ...(world.floor || {}) }, walls: { ...cfg0.walls, ...(world.walls || {}) }, objects: world.objects || [], globalAudioZones: world.globalAudioZones || [], doors: world.doors || [] }
    : cfg0;
  const landscapeUrl = world && world.landscapeUrl;
  const { floor, walls, ceiling, aisle, grid, objects, globalAudioZones, rowAudioZones } = cfg;
  const sizeX = floor.sizeX || 80;
  const sizeZ = floor.sizeZ || 40;
  const wh = walls.height || 12;
  const t = walls.thickness || 0.5;
  const wallSide = walls.invisibleForTPS ? THREE.FrontSide : THREE.DoubleSide;
  const wallOpacity = walls.model === "glass" ? 0.25 : 1;

  return (
    <group>
      {/* SOL */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[sizeX, sizeZ]} />
        <meshStandardMaterial
          color={floor.color}
          roughness={floor.model === "marble" ? 0.15 : 0.9}
          metalness={floor.model === "marble" ? 0.4 : 0}
        />
      </mesh>

      {/* ALLEE CENTRALE */}
      {aisle.width > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[aisle.width, aisle.length]} />
          <meshStandardMaterial color={aisle.color} roughness={0.9} />
        </mesh>
      )}

      {/* QUADRILLAGE */}
      {grid.show && <GridHelper sizeX={sizeX} sizeZ={sizeZ} step={grid.step || 1} />}

      {/* MURS (FrontSide = invisibles depuis l exterieur) */}
      <mesh position={[0, wh / 2, -sizeZ / 2]} material-side={wallSide}>
        <boxGeometry args={[sizeX + t, wh, t]} />
        <meshStandardMaterial color={walls.color} side={wallSide} transparent={walls.model === "glass"} opacity={wallOpacity} />
      </mesh>
      <mesh position={[0, wh / 2, sizeZ / 2]}>
        <boxGeometry args={[sizeX + t, wh, t]} />
        <meshStandardMaterial color={walls.color} side={wallSide} transparent={walls.model === "glass"} opacity={wallOpacity} />
      </mesh>
      <mesh position={[-sizeX / 2, wh / 2, 0]}>
        <boxGeometry args={[t, wh, sizeZ]} />
        <meshStandardMaterial color={walls.color} side={wallSide} transparent={walls.model === "glass"} opacity={wallOpacity} />
      </mesh>
      <mesh position={[sizeX / 2, wh / 2, 0]}>
        <boxGeometry args={[t, wh, sizeZ]} />
        <meshStandardMaterial color={walls.color} side={wallSide} transparent={walls.model === "glass"} opacity={wallOpacity} />
      </mesh>

      {/* PLAFOND */}
      {ceiling.enabled && (
        <mesh position={[0, ceiling.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[sizeX, sizeZ]} />
          <meshStandardMaterial color={ceiling.color} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* PAYSAGE IMPORTE (GLB d un logiciel 3D) : remplit le perimetre */}
      {landscapeUrl && (
        <Suspense fallback={null}>
          <ObjBoundary>
            <FitLandscape url={landscapeUrl} sizeX={sizeX} sizeZ={sizeZ} />
          </ObjBoundary>
        </Suspense>
      )}

      {/* PORTES INTER-MONDES */}
      {(cfg.doors || []).map((d) => (
        <DoorPortal key={d.id} door={d} onEnter={onEnterDoor} />
      ))}

      {/* OBJETS 3D LIBRES */}
      {(objects || []).map((o) => (
        <group key={o.id} position={[o.x, o.y, o.z]}>
          {o.kind === "interactive" ? (
            <group>
              <mesh position={[0, 1.05, 0]} onClick={() => onInteract && onInteract({ name: o.name || "Contenu interactif", url: o.url })}>
                <planeGeometry args={[1.6, 1.0]} />
                <meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.4} side={THREE.DoubleSide} />
              </mesh>
              <Html position={[0, 1.95, 0]} center distanceFactor={20} zIndexRange={[10, 0]}>
                <button onClick={() => onInteract && onInteract({ name: o.name, url: o.url })} style={{
                  background: "rgba(11,16,32,0.85)", color: "#22d3ee", border: "1px solid #22d3ee",
                  borderRadius: 6, fontSize: 12, padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap",
                }}>✨ {o.name || "Interactif"}</button>
              </Html>
            </group>
          ) : (
            <Suspense fallback={null}>
              <ObjBoundary>
                <PlacedModel url={o.url} x={0} y={0} z={0} scale={o.scale} rotY={o.rotY} />
              </ObjBoundary>
            </Suspense>
          )}
        </group>
      ))}

      {/* ZONES AUDIO CUBIQUES (sections de la map) */}
      {(globalAudioZones || []).map((z, i) => <AudioZoneBox key={z.id || i} z={z} i={i} />)}

      {/* ZONES AUDIO PAR RANGEE */}
      {Object.entries(rowAudioZones || {}).map(([row, z]) => (
        <AudioZoneBox key={"row" + row} z={{ ...z, name: `Rangée ${Number(row) + 1}` }} />
      ))}
    </group>
  );
}
