// ===========================================================================
// Conversations VERROUILLEES (client, hors React).
//
// Une session verrouillee est un groupe PRIVE : seuls ses MEMBRES recoivent
// les messages texte et les fichiers (le serveur fait le gate). La voix y est
// privee aussi, via un canal Agora dedie (session.channel = "lock-<id>").
//
// On s'appuie sur multiplayer.js pour le transport WebSocket :
//  - mp.sendRaw(obj)  : envoie un message custom (types lock-*)
//  - mp.onRaw(fn)     : recoit TOUS les messages (on filtre lock-*)
// ===========================================================================
import * as mp from "net/multiplayer";
import * as voice from "net/proximityVoice";

// id -> { id, name, ownerId, channel, members:[peerId], messages:[], files:[] }
const sessions = new Map();
let activeId = null;
let inited = false;
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try { fn(getSessions()); } catch (e) { /* ignore */ }
  }
}

export function getSessions() {
  return Array.from(sessions.values());
}
export function getActive() {
  return activeId ? sessions.get(activeId) || null : null;
}
// Canal Agora de la session active (ou null) -> la voix y est privee.
export function getActiveChannel() {
  const s = getActive();
  return s ? s.channel : null;
}
export function setActive(id) {
  activeId = id;
  notify();
}
export function onSessionsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Insere/met-a-jour une session en conservant son historique (messages/fichiers).
function upsert(session) {
  const prev = sessions.get(session.id);
  const next = {
    id: session.id,
    name: session.name,
    ownerId: session.ownerId,
    channel: session.channel,
    members: session.members || [],
    messages: prev ? prev.messages : [],
    files: prev ? prev.files : [],
  };
  sessions.set(session.id, next);
  return next;
}

// Abonnement unique aux messages lock-* envoyes par le serveur.
export function init() {
  if (inited) return;
  inited = true;
  mp.onRaw((m) => {
    if (!m || typeof m.type !== "string") return;
    if (m.type === "lock-created" || m.type === "lock-synced") {
      const s = upsert(m.session);
      if (!activeId) activeId = s.id;
      notify();
    } else if (m.type === "lock-updated") {
      upsert(m.session);
      notify();
    } else if (m.type === "lock-msg") {
      const s = sessions.get(m.sessionId);
      if (!s) return;
      s.messages.push({
        from: m.from,
        name: m.name,
        color: m.color,
        text: m.text,
        ts: m.ts,
        mine: m.from === mp.getSelfId(),
      });
      notify();
    } else if (m.type === "lock-file") {
      const s = sessions.get(m.sessionId);
      if (!s) return;
      s.files.push({
        from: m.from,
        name: m.name,
        fileName: m.fileName,
        mime: m.mime,
        size: m.size,
        data: m.data,
        ts: m.ts,
        mine: m.from === mp.getSelfId(),
      });
      notify();
    } else if (m.type === "lock-closed") {
      sessions.delete(m.sessionId);
      if (activeId === m.sessionId) {
        activeId = null;
        voice.setVoiceChannel(null);
      }
      notify();
    }
  });
}

export function create(name, inviteIds) {
  mp.sendRaw({
    type: "lock-create",
    name: name || "Conversation verrouillée",
    inviteIds: inviteIds || [],
  });
}

export function leave(id) {
  if (activeId === id) {
    activeId = null;
    voice.setVoiceChannel(null);
  }
  sessions.delete(id);
  mp.sendRaw({ type: "lock-leave", sessionId: id });
  notify();
}

export function sendText(id, text) {
  mp.sendRaw({ type: "lock-msg", sessionId: id, text });
}

// file : { name, mime, size, data (base64 sans prefixe data:...) }
export function sendFile(id, file) {
  mp.sendRaw({
    type: "lock-file",
    sessionId: id,
    fileName: file.name,
    mime: file.mime,
    size: file.size,
    data: file.data,
  });
}

export default {
  init,
  create,
  leave,
  sendText,
  sendFile,
  getSessions,
  getActive,
  getActiveChannel,
  setActive,
  onSessionsChange,
};
