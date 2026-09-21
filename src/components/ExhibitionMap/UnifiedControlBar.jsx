import React, { useEffect, useState } from "react";
import * as voice from "net/proximityVoice";
import * as lock from "net/conversationLock";
import * as mp from "net/multiplayer";
import * as bots from "net/bots";
import playerStore from "components/AvatarCustomization/playerStore";
import ProximityChat from "./ProximityChat";
import LockedConversations from "./LockedConversations";
import BotChat from "./BotChat";

// ===========================================================================
// Barre de controle unifiee (bas de l ecran, remplace les 3 panneaux flottants).
// - Onglets : Chat de proximite / Conversations privees / Bot
// - Boutons globaux : micro, SORTIE audio (casque), fullscreen, quitter
// - Le panneau de contenu s ouvre AU-DESSUS de la barre.
// ===========================================================================
export default function UnifiedControlBar({ onExit, fullscreenTargetId, showMap, onToggleMap }) {
  const [tab, setTab] = useState(null); // null | "prox" | "lock" | "bot"
  const [vstate, setVstate] = useState(voice.state());
  const [outputMuted, setOutputMuted] = useState(voice.isAudioOutputMuted());
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [lockCount, setLockCount] = useState(lock.getSessions().length);
  const [botActive, setBotActive] = useState(!!bots.getSelectedId());
  const [nearby, setNearby] = useState(0);

  // Etat voix (polled).
  useEffect(() => {
    const t = setInterval(() => {
      voice.tick();
      setVstate(voice.state());
      setOutputMuted(voice.isAudioOutputMuted());
    }, 600);
    return () => clearInterval(t);
  }, []);

  // Nombre de visiteurs a proximite (badge de l onglet proximite).
  useEffect(() => {
    let mounted = true;
    const t = setInterval(() => {
      if (!mounted) return;
      try {
        const pos = playerStore.position;
        let n = 0;
        const peers = mp.getPeers();
        if (pos) {
          for (const p of peers) {
            if (Math.hypot(p.x - pos.x, p.z - pos.z) <= 12) n++;
          }
        } else {
          n = peers.length;
        }
        setNearby(n);
      } catch (e) { /* ignore */ }
    }, 1000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  // Sessions verrouillees + bot selectionne (badges des onglets).
  useEffect(() => {
    lock.init();
    const u1 = lock.onSessionsChange((s) => setLockCount(s.length));
    const u2 = bots.onSelect((id) => {
      setBotActive(!!id);
      if (id) setTab("bot"); // ouvre l onglet bot des qu on clique un bot 3D
    });
    return () => { u1(); u2(); };
  }, []);

  // Fullscreen : suivi de l etat reel du document.
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        const el = (fullscreenTargetId && document.getElementById(fullscreenTargetId)) || document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
      }
    } catch (e) { /* ignore */ }
  };

  const toggleMic = () => {
    // Voix privee si une conversation verrouillee est active, sinon hall.
    voice.setVoiceChannel(lock.getActiveChannel());
    voice.toggleMic();
    setVstate(voice.state());
  };

  const toggleOutput = () => {
    voice.setAudioOutputMuted(!outputMuted);
    setOutputMuted(!outputMuted);
  };

  const toggleTab = (t) => setTab((cur) => (cur === t ? null : t));

  const barBtn = (active, danger) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 64,
    padding: "6px 10px",
    background: active ? "rgba(102,126,234,0.35)" : "transparent",
    color: danger ? "#fca5a5" : "#e2e8f0",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 11,
    lineHeight: 1.2,
    transition: "background 0.2s ease",
  });

  const iconStyle = { fontSize: 18 };

  const micOn = vstate.joined && vstate.micOn;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 12,
        zIndex: 1060,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        maxWidth: "96vw",
      }}
    >
      {/* Panneau de contenu (au-dessus de la barre) */}
      {tab && (
        <div
          style={{
            width: 420,
            maxWidth: "92vw",
            maxHeight: "55vh",
            overflowY: "auto",
            background: "rgba(11,16,32,0.96)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: tab === "prox" ? "block" : "none" }}>
            <ProximityChat mode="bar" />
          </div>
          <div style={{ display: tab === "lock" ? "block" : "none" }}>
            <LockedConversations layout="bar" />
          </div>
          <div style={{ display: tab === "bot" ? "block" : "none" }}>
            <BotChat mode="bar" />
          </div>
        </div>
      )}

      {/* Barre principale */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "6px 8px",
          background: "rgba(11,16,32,0.92)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 16,
          boxShadow: "0 10px 34px rgba(0,0,0,0.5)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Onglets chat/conversations */}
        <button style={barBtn(tab === "prox")} onClick={() => toggleTab("prox")} title="Chat de proximite">
          <span style={iconStyle}>💬</span>
          <span>Proximite{nearby > 0 ? ` (${nearby})` : ""}</span>
        </button>
        <button style={barBtn(tab === "lock")} onClick={() => toggleTab("lock")} title="Conversations privees">
          <span style={iconStyle}>🔒</span>
          <span>Prive{lockCount > 0 ? ` (${lockCount})` : ""}</span>
        </button>
        <button
          style={{ ...barBtn(tab === "bot"), opacity: botActive || tab === "bot" ? 1 : 0.7 }}
          onClick={() => toggleTab("bot")}
          title="Assistant bot"
        >
          <span style={iconStyle}>🤖</span>
          <span>Bot{botActive ? " •" : ""}</span>
        </button>

        {/* Plan du salon */}
        {onToggleMap && (
          <button
            style={barBtn(showMap)}
            onClick={onToggleMap}
            title={showMap ? "Masquer le plan du salon" : "Afficher le plan du salon"}
          >
            <span style={iconStyle}>🗺️</span>
            <span>Plan</span>
          </button>
        )}

        {/* Separateur */}
        <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.15)", margin: "4px 4px" }} />

        {/* Micro (entree) */}
        <button
          style={barBtn(micOn)}
          onClick={toggleMic}
          title={vstate.error ? "Voix indisponible : " + vstate.error : micOn ? "Couper le micro" : "Activer le micro"}
        >
          <span style={iconStyle}>{vstate.starting ? "🔄" : micOn ? "🎤" : "🎙️"}</span>
          <span>{micOn ? "Micro ON" : "Micro"}</span>
        </button>

        {/* Sortie audio (casque) */}
        <button
          style={barBtn(!outputMuted && vstate.joined)}
          onClick={toggleOutput}
          title={outputMuted ? "Reactiver la sortie audio" : "Couper la sortie audio"}
        >
          <span style={iconStyle}>{outputMuted ? "🔇" : "🔊"}</span>
          <span>{outputMuted ? "Son coupe" : "Son"}</span>
        </button>

        {/* Fullscreen */}
        <button
          style={barBtn(isFullscreen)}
          onClick={toggleFullscreen}
          title={isFullscreen ? "Quitter le plein ecran" : "Plein ecran (sans menus)"}
        >
          <span style={iconStyle}>{isFullscreen ? "🗗" : "⛶"}</span>
          <span>{isFullscreen ? "Reduire" : "Plein ecran"}</span>
        </button>

        {/* Quitter */}
        {onExit && (
          <button style={barBtn(false, true)} onClick={onExit} title="Retour aux expositions">
            <span style={iconStyle}>🚪</span>
            <span>Quitter</span>
          </button>
        )}
      </div>
    </div>
  );
}
