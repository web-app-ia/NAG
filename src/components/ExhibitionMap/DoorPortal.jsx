import React, { useRef, useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// ===========================================================================
// PORTE INTER-MONDES (transit entre univers).
// Cadre lumineux pose au mur/perimetre + label flottant. Le clic declenche
// la transition (chargement de l univers cible). La detection de proximite
// (hint "appuyez sur E") est geree ici via un tick leger.
// ===========================================================================
export default function DoorPortal({ door, onEnter }) {
  const group = useRef();
  const [near, setNear] = useState(false);
  const W = door.width || 4;
  const H = door.height || 5;


  return (
    <group ref={group} position={[door.x, 0, door.z]}>
      {/* Cadre lumineux */}
      <mesh position={[0, H / 2, 0]} onClick={(e) => { e.stopPropagation(); onEnter && onEnter(door); }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}>
        <boxGeometry args={[W, H, 0.3]} />
        <meshStandardMaterial color="#0b1020" emissive="#22d3ee" emissiveIntensity={0.55}
          transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      {/* Contour */}
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[W + 0.4, H + 0.4, 0.15]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.6} />
      </mesh>
      {/* Label flottant */}
      <Html position={[0, H + 1.1, 0]} center distanceFactor={26} zIndexRange={[9, 0]}>
        <div style={{
          background: "rgba(11,16,32,0.9)",
          border: "1px solid #22d3ee",
          color: "#e0f7fa",
          borderRadius: 10,
          padding: "6px 14px",
          fontSize: 13,
          whiteSpace: "nowrap",
          cursor: "pointer",
        }} onClick={() => onEnter && onEnter(door)} title="Entrer">
          🚪 {door.label || door.targetWorldId}
          <div style={{ fontSize: 10, opacity: 0.7, textAlign: "center" }}>(cliquez pour entrer)</div>
        </div>
      </Html>
    </group>
  );
}
