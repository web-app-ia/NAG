import React, { useEffect, useRef, useState } from "react";
import * as bots from "net/bots";
import playerStore from "components/AvatarCustomization/playerStore";

const MAX_FILE = 2 * 1024 * 1024; // 2 Mo

// Rendu d'une "UI generative" renvoyee par le bot : une carte avec un titre,
// un texte et des elements/actions. Un element avec action = bouton.
function UiCard({ ui, onAction }) {
  if (!ui) return null;
  const btn = {
    border: "1px solid #22d3ee",
    background: "rgba(34,211,238,0.15)",
    color: "#e2f7fb",
    borderRadius: 6,
    fontSize: 12,
    padding: "2px 8px",
    cursor: "pointer",
  };
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 8,
        padding: 8,
        marginTop: 6,
        background: "rgba(255,255,255,0.04)",
      }}
    >
      {ui.title && <div style={{ fontWeight: 700, marginBottom: 4 }}>{ui.title}</div>}
      {ui.text && <div style={{ fontSize: 13, marginBottom: 6, opacity: 0.9 }}>{ui.text}</div>}
      {(ui.items || []).map((it, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            padding: "4px 0",
            borderTop: i ? "1px solid rgba(255,255,255,0.08)" : "none",
          }}
        >
          <span style={{ fontSize: 13 }}>
            {it.label}
            {it.sub ? <span style={{ opacity: 0.6 }}> — {it.sub}</span> : null}
          </span>
          {it.action && (
            <button style={btn} onClick={() => onAction(it.action)}>
              Y aller
            </button>
          )}
        </div>
      ))}
      {(ui.actions || []).map((a, i) => (
        <button key={i} style={{ ...btn, marginTop: 6 }} onClick={() => onAction(a.action)}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

// Panneau de conversation avec un bot : texte, entree voix (Web Speech API),
// sortie voix (SpeechSynthesis), pieces jointes, et UI generative.
export default function BotChat({ mode = "floating" } = {}) {
  const [selId, setSelId] = useState(() => bots.getSelectedId());
  const [list, setList] = useState(() => bots.getBots());
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState("");
  const listRef = useRef(null);
  const inBar = mode === "bar";
  const recRef = useRef(null);
  const sendRef = useRef(null);

  useEffect(() => {
    const u1 = bots.onSelect((id) => {
      setSelId(id);
      setMsgs([]);
      setErr("");
    });
    const u2 = bots.onBots(() => setList(bots.getBots()));
    setList(bots.getBots());
    return () => {
      u1();
      u2();
    };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs, busy]);

  // Arret propre a la fermeture (micro + synthese).
  useEffect(() => {
    return () => {
      try { recRef.current && recRef.current.stop(); } catch (e) { /* ignore */ }
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    };
  }, []);

  const bot = list.find((b) => b.id === selId) || null;
  if (!bot) {
    if (inBar) {
      return (
        <div style={{ padding: 16, fontSize: 13, color: "#e2e8f0", opacity: 0.8 }}>
          🤖 Aucun bot sélectionné. Approchez-vous d'une orbe violette dans le hall
          et cliquez dessus pour parler à un assistant.
        </div>
      );
    }
    return null;
  }

  const speakText = (text) => {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).slice(0, 300));
      u.lang = "fr-FR";
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* ignore */
    }
  };

  // Action issue d'une UI generative (ex. teleportation vers un stand).
  const onAction = (action) => {
    if (!action) return;
    if (action.type === "teleport" && typeof action.x === "number") {
      playerStore.requestTeleport(action.x, action.z, action.heading);
    }
  };

  const send = async (overrideText) => {
    const text = String(overrideText != null ? overrideText : input).trim();
    if ((!text && files.length === 0) || busy) return;
    const history = msgs.map((m) => ({ role: m.role, content: m.content }));
    const sentFiles = files;
    setMsgs((m) => [
      ...m,
      { role: "user", content: text || "(fichier)", files: sentFiles.map((f) => f.name) },
    ]);
    setInput("");
    setFiles([]);
    setBusy(true);
    setErr("");
    try {
      const res = await bots.chat(bot.id, {
        text,
        files: sentFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        history,
      });
      const reply = { role: "bot", content: res.reply || "", ui: res.ui || null };
      setMsgs((m) => [...m, reply]);
      if (speak && reply.content) speakText(reply.content);
    } catch (e) {
      setErr("Le bot n'a pas répondu (serveur injoignable ?).");
    } finally {
      setBusy(false);
    }
  };
  sendRef.current = send;

  // Entree voix : reconnaissance vocale du navigateur (fr-FR), puis envoi auto.
  const toggleVoice = () => {
    const SR =
      typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    if (!SR) {
      setErr("La reconnaissance vocale n'est pas disponible dans ce navigateur.");
      return;
    }
    if (listening) {
      try { recRef.current && recRef.current.stop(); } catch (e) { /* ignore */ }
      setListening(false);
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "fr-FR";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const txt = e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript;
        if (txt) {
          setInput(txt);
          setTimeout(() => sendRef.current && sendRef.current(txt), 0);
        }
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
      setErr("");
    } catch (e) {
      setErr("Micro indisponible.");
      setListening(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_FILE) {
      setErr("Fichier trop lourd (max 2 Mo).");
      return;
    }
    setFiles((prev) => [...prev, { name: f.name, size: f.size, type: f.type }]);
    setErr("");
  };

  const iconBtn = (active) => ({
    border: "1px solid #555",
    borderRadius: 8,
    background: active ? "#0d6efd" : "transparent",
    color: "#fff",
    cursor: "pointer",
    padding: "4px 8px",
    fontSize: 14,
  });

  const wrapStyle = inBar
    ? { width: "100%", display: "flex", flexDirection: "column", background: "transparent", color: "#fff" }
    : {
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 16,
        width: 380,
        maxHeight: "62vh",
        display: "flex",
        flexDirection: "column",
        background: "rgba(11,16,32,0.94)",
        color: "#fff",
        border: "1px solid #7c3aed",
        borderRadius: 12,
        zIndex: 1052,
        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
      };
  return (
    <div style={wrapStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderBottom: "1px solid #333",
        }}
      >
        <div style={{ fontWeight: 700 }}>
          🤖 {bot.name} <span style={{ opacity: 0.6, fontWeight: 400 }}>— {bot.role}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={iconBtn(speak)}
            title="Lire les réponses à voix haute"
            onClick={() => setSpeak((s) => !s)}
          >
            {speak ? "🔊" : "🔇"}
          </button>
          <button style={iconBtn(false)} title="Fermer" onClick={() => bots.selectBot(null)}>
            ✕
          </button>
        </div>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 10 }}>
        {msgs.length === 0 && (
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Dites bonjour à {bot.name} ! Ex. « liste des stands », « où est NovaLabs ? »,
            « combien de visiteurs ? ». Vous pouvez parler (🎤) ou joindre un fichier (📎).
          </div>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                background: m.role === "user" ? "#0d6efd" : "rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 13,
              }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              {m.files && m.files.length > 0 && (
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                  📎 {m.files.join(", ")}
                </div>
              )}
              {m.role === "bot" && m.ui && <UiCard ui={m.ui} onAction={onAction} />}
            </div>
          </div>
        ))}
        {busy && <div style={{ fontSize: 12, opacity: 0.6 }}>… {bot.name} réfléchit</div>}
      </div>

      {err && (
        <div style={{ padding: "4px 10px", fontSize: 12, color: "#fca5a5" }}>{err}</div>
      )}

      {files.length > 0 && (
        <div style={{ padding: "2px 10px", fontSize: 11, opacity: 0.8 }}>
          📎 {files.map((f) => f.name).join(", ")}
          <button
            onClick={() => setFiles([])}
            style={{ marginLeft: 8, background: "none", border: "none", color: "#fca5a5", cursor: "pointer" }}
          >
            retirer
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid #333" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Écrivez votre message…"
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid #444",
            borderRadius: 8,
            color: "#fff",
            padding: "6px 8px",
            fontSize: 13,
          }}
        />
        <button style={iconBtn(listening)} title="Parler (reconnaissance vocale)" onClick={toggleVoice}>
          {listening ? "⏹" : "🎤"}
        </button>
        <label style={{ ...iconBtn(false), display: "flex", alignItems: "center" }} title="Joindre un fichier">
          📎
          <input type="file" onChange={onFile} style={{ display: "none" }} />
        </label>
        <button
          style={{ ...iconBtn(false), background: "#0d6efd" }}
          onClick={() => send()}
          disabled={busy}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
