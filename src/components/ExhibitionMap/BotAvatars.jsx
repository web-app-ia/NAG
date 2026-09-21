import React, { useEffect, useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import * as bots from "net/bots";

// Un bot 3D : un orbe lumineux + un anneau au sol + une etiquette cliquable.
// Cliquer l'orbe ou l'etiquette ouvre la conversation avec le bot.
function Bot({ bot }) {
  const [hover, setHover] = useState(false);
  const open = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    bots.selectBot(bot.id);
  };
  return (
    <group position={[bot.x, 0, bot.z]}>
      <mesh
        position={[0, 1.5, 0]}
        onClick={open}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      >
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={hover ? 1.1 : 0.6}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.85, 1.15, 40]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 2.35, 0]} center distanceFactor={20} zIndexRange={[10, 0]}>
        <button
          onClick={open}
          title="Parler à ce bot"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px",
            borderRadius: 999,
            border: "1px solid #7c3aed",
            background: "rgba(124,58,237,0.85)",
            color: "#fff",
            fontSize: 12,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          🤖 {bot.name} — {bot.role}
        </button>
      </Html>
    </group>
  );
}

// Liste des bots du hall (chargee depuis le serveur).
export default function BotAvatars() {
  const [list, setList] = useState(() => bots.getBots());
  useEffect(() => {
    const unsub = bots.onBots(() => setList(bots.getBots()));
    setList(bots.getBots());
    return unsub;
  }, []);
  return (
    <>
      {list.map((b) => (
        <Bot key={b.id} bot={b} />
      ))}
    </>
  );
}
