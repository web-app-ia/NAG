import React, { useEffect, useRef, useState } from "react";
import { Badge } from "react-bootstrap";
import * as mp from "net/multiplayer";
import * as voice from "net/proximityVoice";
import * as lock from "net/conversationLock";
import playerStore from "components/AvatarCustomization/playerStore";

// Rayon de proximite : doit etre IDENTIQUE a celui du serveur (server.ts -> PROXIMITY = 12).
const PROXIMITY = 12;

// Panneau de chat texte de proximite + voix de proximite (bulle fixe, en bas a droite).
// Les messages sont differes par le serveur : on ne recoit que ceux des avatars
// situes a moins de PROXIMITY unites de soi. La voix suit la meme regle : on
// n'entend les autres que s'ils sont proches (mute automatique par distance).
export default function ProximityChat({ mode = "floating", onOpenChange } = {}) {
  const [open, setOpenRaw] = useState(mode === "bar");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [nearby, setNearby] = useState(0);
  const [connected, setConnected] = useState(false);
  const [vstate, setVstate] = useState(voice.state());
    const listRef = useRef(null);
  const inBar = mode === "bar";
  const setOpen = (v) => { setOpenRaw(v); if (onOpenChange) onOpenChange(v); };

  // Nouveaux messages entrants.
  useEffect(() => {
    const unsub = mp.onChat((m) => {
      setMessages((prev) => [
        ...prev.slice(-80),
        { ...m, mine: m.from === mp.getSelfId() },
      ]);
    });
    return unsub;
  }, []);

  // Historique persiste (24 h) : recharge les messages recents a l ouverture.
  useEffect(() => {
    let alive = true;
    fetch("/api/chat-history")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!alive || !Array.isArray(list) || !list.length) return;
        setMessages((prev) =>
          prev.length
            ? prev
            : list.map((m) => ({ ...m, mine: m.from === mp.getSelfId() }))
        );
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Recalcule le nombre de visiteurs a proximite (localement, meme rayon).
  useEffect(() => {
    const t = setInterval(() => {
      const me = playerStore.position;
      let n = 0;
      for (const p of mp.getPeers()) {
        if (Math.hypot(p.x - me.x, p.z - me.z) <= PROXIMITY) n++;
      }
      setNearby(n);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Etat de connexion (petite pastille dans l'en-tete).
  useEffect(() => {
    const t = setInterval(() => setConnected(mp.isConnected()), 1500);
    return () => clearInterval(t);
  }, []);

  // Voix de proximite : on polit l'etat (rejoint / micro / erreur) et on
  // recalcule le mute par distance a chaque tick (les avatars bougent en continu).
  // Au demontage, on quitte proprement la voice channel (libere le micro).
  useEffect(() => {
    const t = setInterval(() => {
      voice.tick();
      setVstate(voice.state());
    }, 600);
    return () => {
      clearInterval(t);
      try { voice.stopVoice(); } catch (e) { /* ignore */ }
    };
  }, []);

  // Auto-scroll vers le bas a chaque message.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // Etat du bouton micro (calcule depuis l'etat voix police).
  const micActive = vstate.joined && vstate.micOn;
  const micLabel = vstate.starting
    ? "🔄"
    : micActive
    ? "🎤"
    : vstate.joined
    ? "🔇"
    : vstate.error
    ? "⚠️"
    : "🎙️";
  const micTitle = vstate.error
    ? "Voix indisponible (Agora) : " + vstate.error
    : vstate.starting
    ? "Connexion audio…"
    : micActive
    ? "Couper le micro"
    : "Activer la voix de proximité";

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    mp.sendChat(t);
    setText("");
  };

  const wrapStyle = inBar ? { width: "100%" } : { position: "fixed", right: 16, bottom: 16, width: 300, zIndex: 1050 };
  return (
    <div style={wrapStyle}>
      <div className="card shadow" style={{ border: inBar ? "none" : "1px solid #334155", boxShadow: inBar ? "none" : undefined, margin: 0 }}>
        {!inBar && (
        <div
          className="card-header d-flex justify-content-between align-items-center py-2 px-3"
          style={{ cursor: "pointer", background: "#0f172a", color: "#e2e8f0" }}
          onClick={() => setOpen((o) => !o)}
        >
          <span>
            💬 Chat de proximité{" "}
            <span
              title={connected ? "Connecté" : "Hors ligne"}
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: connected ? "#22c55e" : "#94a3b8",
                marginLeft: 4,
              }}
            />
          </span>
          <span className="d-flex align-items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Si une conversation verrouillee est active, la voix devient
                // privee au groupe (canal Agora dedie) ; sinon voix de proximite
                // du hall.
                voice.setVoiceChannel(lock.getActiveChannel());
                voice.toggleMic();
              }}
              title={micTitle}
              style={{
                cursor: "pointer",
                border: "1px solid #475569",
                background: micActive ? "#16a34a" : "#1e293b",
                color: "#e2e8f0",
                borderRadius: "8px",
                padding: "2px 8px",
                fontSize: 13,
                marginRight: 8,
              }}
            >
              {micLabel} Voix
            </button>
            <Badge bg="light" text="dark" className="mr-2">
              {nearby} à proximité
            </Badge>
            <span>{open ? "▾" : "▸"}</span>
          </span>
        </div>
        )}
        {(inBar || open) && (
          <>
            {vstate.error && (
              <div className="px-2 py-1" style={{ background: "#2a1414", color: "#fca5a5", fontSize: 12 }}>
                ⚠️ Voix indisponible (Agora) : {vstate.error}
              </div>
            )}
            {!vstate.error && vstate.joined && (
              <div className="px-2 py-1" style={{ background: "#0b1f14", color: "#86efac", fontSize: 12 }}>
                🎧 Voix de proximité active — {vstate.remoteCount} flux reçu
                {vstate.remoteCount > 1 ? "s" : ""}. Micro : {vstate.micOn ? "activé" : "coupé"}.
              </div>
            )}
            <div
              ref={listRef}
              className="px-2 py-2"
              style={{ height: 220, overflowY: "auto", fontSize: 13, background: "#0b1020", color: "#e2e8f0" }}
            >
              {messages.length === 0 && (
                <div className="text-muted">
                  Aucun message. Approchez-vous d'un autre visiteur (moins de 12 m)
                  pour discuter.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className="mb-1" style={{ lineHeight: 1.35 }}>
                  <strong style={{ color: m.mine ? "#60a5fa" : m.color || "#fff" }}>
                    {m.mine ? "Vous" : m.name} :
                  </strong>{" "}
                  {m.text}
                </div>
              ))}
            </div>
            <form
              onSubmit={send}
              className="d-flex p-2"
              style={{ borderTop: "1px solid #334155", background: "#0f172a" }}
            >
              <input
                className="form-control form-control-sm mr-1"
                placeholder="Votre message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
              />
              <button className="btn btn-sm btn-primary" type="submit">
                Envoyer
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
