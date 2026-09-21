import React, { useEffect, useRef, useState } from "react";
import * as mp from "net/multiplayer";
import * as lock from "net/conversationLock";
import * as voice from "net/proximityVoice";
import playerStore from "components/AvatarCustomization/playerStore";

// Rayon de proximite pour proposer des invites (meme que le chat/voix).
const PROXIMITY = 12;
// Taille max d'un fichier partage (le serveur borne aussi le base64 a ~3 Mo).
const MAX_FILE = 2 * 1024 * 1024;

// base64 (sans prefixe) -> Blob, pour le telechargement "open offline".
function b64ToBlob(b64, mime) {
  const bin = atob(b64);
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime || "application/octet-stream" });
}
function downloadFile(f) {
  try {
    const blob = b64ToBlob(f.data, f.mime);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.fileName || "fichier";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (e) {
    /* ignore */
  }
}
function fmtSize(n) {
  if (!n) return "";
  if (n < 1024) return n + " o";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " Ko";
  return (n / 1024 / 1024).toFixed(1) + " Mo";
}
function peerName(id) {
  if (id === mp.getSelfId()) return "Vous";
  const p = mp.getPeer(id);
  return p ? p.name : id;
}

// Panneau des conversations verrouillees (bas gauche). Permet de creer une
// conversation privee/groupe parmi les proches, d'echanter texte + fichiers
// (telechargeables hors-ligne) et d'activer une voix PRIVEE au groupe.
export default function LockedConversations({ layout = "floating" } = {}) {
  const [open, setOpen] = useState(layout === "bar");
  const inBar = layout === "bar";
  const [sessions, setSessions] = useState(lock.getSessions());
  const [mode, setMode] = useState(lock.getSessions().length ? "list" : "picker");
  const [invites, setInvites] = useState({}); // peerId -> bool
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [nearby, setNearby] = useState([]);
  const [vstate, setVstate] = useState(voice.state());
  const fileRef = useRef(null);

  useEffect(() => {
    lock.init();
    const unsub = lock.onSessionsChange((s) => {
      setSessions(s);
      if (s.length && mode === "picker") setMode("list");
    });
    // Rafraichit les proches (pour les inviter) ~1 Hz.
    const t = setInterval(() => {
      const me = playerStore.position;
      const list = mp
        .getPeers()
        .filter((p) => Math.hypot(p.x - me.x, p.z - me.z) <= PROXIMITY)
        .map((p) => ({ id: p.id, name: p.name }));
      setNearby(list);
    }, 1000);
    // Etat voix (canal courant + micro).
    const vt = setInterval(() => setVstate(voice.state()), 600);
    return () => {
      unsub();
      clearInterval(t);
      clearInterval(vt);
    };
  }, []); // eslint-disable-line

  const active = lock.getActive();
  const activeId = active ? active.id : null;

  const toggleInvite = (id) =>
    setInvites((prev) => ({ ...prev, [id]: !prev[id] }));

  const createSession = () => {
    const ids = Object.keys(invites).filter((k) => invites[k]);
    lock.create(name.trim() || "Conversation verrouillée", ids);
    setInvites({});
    setName("");
    setMode("list");
  };

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !activeId) return;
    lock.sendText(activeId, t);
    setText("");
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !activeId) return;
    if (file.size > MAX_FILE) {
      alert("Fichier trop volumineux (max ~2 Mo en demo).");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const comma = dataUrl.indexOf(",");
      const data = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      lock.sendFile(activeId, {
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        data,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const micForActive = () => {
    if (!active) return;
    lock.setActive(active.id);
    voice.setVoiceChannel(active.channel);
    voice.toggleMic();
  };

  const voiceHere = active && vstate.channel === active.channel;

  const wrapStyle = inBar ? { width: "100%" } : { position: "fixed", left: 16, bottom: 16, width: 330, zIndex: 1051 };
  return (
    <div style={wrapStyle}>
      <div className="card shadow" style={{ border: inBar ? "none" : "1px solid #334155", boxShadow: inBar ? "none" : undefined, margin: 0 }}>
        {!inBar && (
        <div
          className="card-header d-flex justify-content-between align-items-center py-2 px-3"
          style={{ cursor: "pointer", background: "#1a1030", color: "#e2e8f0" }}
          onClick={() => setOpen((o) => !o)}
        >
          <span>🔒 Conversations verrouillées</span>
          <span>{open ? "▾" : "▸"}</span>
        </div>
        )}
        {(inBar || open) && (
          <div style={{ background: "#0b1020", color: "#e2e8f0", fontSize: 13 }}>
            {mode === "picker" ? (
              <div className="p-2">
                <div className="text-muted mb-1">
                  Choisissez les visiteurs proches (&lt; 12 m) à inviter, puis
                  créez la conversation.
                </div>
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="Nom de la conversation (optionnel)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                />
                <div style={{ maxHeight: 160, overflowY: "auto" }}>
                  {nearby.length === 0 && (
                    <div className="text-muted">Aucun visiteur à proximité.</div>
                  )}
                  {nearby.map((p) => (
                    <label
                      key={p.id}
                      className="d-flex align-items-center mb-1"
                      style={{ cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={!!invites[p.id]}
                        onChange={() => toggleInvite(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <div className="d-flex mt-2">
                  <button
                    className="btn btn-sm btn-primary mr-1"
                    onClick={createSession}
                  >
                    Créer
                  </button>
                  {sessions.length > 0 && (
                    <button
                      className="btn btn-sm btn-outline-light"
                      onClick={() => setMode("list")}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-2">
                <div className="d-flex justify-content-between mb-2">
                  <button
                    className="btn btn-sm btn-outline-light"
                    onClick={() => setMode("picker")}
                  >
                    + Nouvelle
                  </button>
                  {sessions.length === 0 && (
                    <span className="text-muted">Aucune conversation.</span>
                  )}
                </div>
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="mb-2"
                    style={{
                      border:
                        s.id === activeId
                          ? "1px solid #0d6efd"
                          : "1px solid #334155",
                      borderRadius: 8,
                      padding: 6,
                    }}
                  >
                    <div
                      className="d-flex justify-content-between align-items-center"
                      style={{ cursor: "pointer" }}
                      onClick={() => lock.setActive(s.id)}
                    >
                      <span>
                        🔒 {s.name}{" "}
                        <span className="text-muted">
                          ({s.members.length} pers.)
                        </span>
                      </span>
                      {s.ownerId === mp.getSelfId() && (
                        <span className="badge badge-light">hôte</span>
                      )}
                    </div>
                    {s.id === activeId && (
                      <div className="mt-2">
                        <div className="text-muted mb-1">
                          Membres : {s.members.map(peerName).join(", ")}
                        </div>
                        <div
                          style={{
                            maxHeight: 150,
                            overflowY: "auto",
                            background: "#0b1020",
                            padding: 4,
                          }}
                        >
                          {s.messages.length === 0 && s.files.length === 0 && (
                            <div className="text-muted">
                              Conversation privée. Messages et fichiers visibles
                              uniquement par le groupe.
                            </div>
                          )}
                          {s.messages.map((m, i) => (
                            <div key={"m" + i} style={{ lineHeight: 1.35 }}>
                              <strong
                                style={{ color: m.mine ? "#60a5fa" : m.color || "#fff" }}
                              >
                                {m.mine ? "Vous" : m.name} :
                              </strong>{" "}
                              {m.text}
                            </div>
                          ))}
                          {s.files.map((f, i) => (
                            <div key={"f" + i} className="mb-1">
                              📎 {f.fileName}{" "}
                              <span className="text-muted">{fmtSize(f.size)}</span>{" "}
                              <button
                                className="btn btn-sm btn-link p-0"
                                style={{ color: "#60a5fa", fontSize: 12 }}
                                onClick={() => downloadFile(f)}
                              >
                                Télécharger
                              </button>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={send} className="d-flex mt-2">
                          <input
                            className="form-control form-control-sm mr-1"
                            placeholder="Message privé..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={500}
                          />
                          <button className="btn btn-sm btn-primary" type="submit">
                            Env
                          </button>
                        </form>
                        <div className="d-flex mt-1">
                          <button
                            className="btn btn-sm mr-1"
                            style={{
                              background: voiceHere && vstate.micOn ? "#16a34a" : "#1e293b",
                              color: "#e2e8f0",
                              border: "1px solid #475569",
                            }}
                            onClick={micForActive}
                            title="Voix privée au groupe"
                          >
                            {voiceHere && vstate.micOn
                              ? "🎤 Micro activé"
                              : voiceHere
                              ? "🔇 Micro coupé"
                              : "🎙️ Voix privée"}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-light"
                            onClick={() => fileRef.current && fileRef.current.click()}
                          >
                            📎 Fichier
                          </button>
                          <input
                            ref={fileRef}
                            type="file"
                            style={{ display: "none" }}
                            onChange={onFile}
                          />
                          <button
                            className="btn btn-sm btn-outline-danger ml-auto"
                            onClick={() => lock.leave(s.id)}
                          >
                            Quitter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
