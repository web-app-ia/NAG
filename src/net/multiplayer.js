// ===========================================================================
// Couche temps reel (WebSocket) cote navigateur.
//
// Responsabilites :
//  - se connecter au serveur sur le canal /ws (meme hote/port que la page)
//  - publier la position/cap de l'avatar local (~10x/s) via playerStore
//  - maintenir la liste des AUTRES visiteurs (pairs) connectes
//  - diffuser les messages de chat de proximite et prevenir l'UI
//
// C'est un module "singleton" hors React : on l'importe la ou on en a besoin
// (hall 3D, plan, chat) sans multiplier les connexions.
// ===========================================================================
import playerStore from "components/AvatarCustomization/playerStore";

const PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";
// En dev comme en prod, le serveur Node ecoute sur le meme hote/port que la page.
const WS_URL = `${PROTOCOL}://${window.location.host}/ws`;

// id -> { id, name, color, photo, availability, x, z, heading } (objets VIVANTS :
// x/z sont mis a jour a chaque "peer-move" SANS re-rendu React).
const peers = new Map();
let socket = null;
let selfId = null;
let moveTimer = null;
// Profil LOCAL (le joueur courant) : expose a l'etiquette 3D au-dessus de sa
// propre tete et aux panneaux d'UI. Mis a jour localement (sans aller-retour
// serveur) pour un rafraichissement instantane de l'etiquette.
let selfProfile = { id: null, name: "Invité", color: "#2563eb", photo: "", availability: "online" };
const selfListeners = new Set();
const notifySelf = () => {
  for (const fn of selfListeners) {
    try { fn(selfProfile); } catch (e) { /* ignore */ }
  }
};
const peerListeners = new Set(); // changement de la liste des pairs (join/leave/statut)
const chatListeners = new Set(); // nouveau message de chat recu

const notifyPeers = () => {
  for (const fn of peerListeners) {
    try { fn(getPeers()); } catch (e) { /* ignore un listener defaillant */ }
  }
};
const notifyChat = (msg) => {
  for (const fn of chatListeners) {
    try { fn(msg); } catch (e) { /* ignore */ }
  }
};

// Ecouteurs de MESSAGES BRUTS : tous les messages (y compris les types non
// geres ici, ex. lock-* des conversations verrouillees) sont relayes aux
// modules qui en ont besoin (conversationLock).
const rawListeners = new Set();
const notifyRaw = (m) => {
  for (const fn of rawListeners) {
    try { fn(m); } catch (e) { /* ignore */ }
  }
};

export function getSelfId() {
  return selfId;
}

export function isConnected() {
  return !!socket && socket.readyState === WebSocket.OPEN;
}

// Renvoie les pairs DISTINCTS de soi (objets vivants : x/z bougent en direct).
export function getPeers() {
  const out = [];
  for (const p of peers.values()) if (p.id !== selfId) out.push(p);
  return out;
}

// Acces direct a un pair vivant (lu dans useFrame pour lisser sa position).
export function getPeer(id) {
  return peers.get(id) || null;
}

export function onPeersChange(fn) {
  peerListeners.add(fn);
  return () => peerListeners.delete(fn);
}

export function onChat(fn) {
  chatListeners.add(fn);
  return () => chatListeners.delete(fn);
}

// Ecoute de tous les messages WS (pour les types non geres ici, ex. lock-*).
export function onRaw(fn) {
  rawListeners.add(fn);
  return () => rawListeners.delete(fn);
}

// Profil LOCAL : lecture + ecoute des changements (utilise par l'etiquette 3D
// au-dessus de la tete du joueur courant et par le panneau de profil).
export function getSelfProfile() {
  return selfProfile;
}
export function onSelfChange(fn) {
  selfListeners.add(fn);
  return () => selfListeners.delete(fn);
}

// Envoi d'un message WS arbitraire (utilise par conversationLock pour lock-*).
export function sendRaw(obj) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(obj));
  }
}

export function connect(me) {
  // Deja connecte ou en cours de connexion : on ne double pas.
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  const profile = {
    name: (me && me.name) || "Invité",
    color: (me && me.color) || "#2563eb",
    photo: (me && me.photo) || "",
    availability: (me && me.availability) || "online",
  };

  let ws;
  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    return; // environnement sans WebSocket : on reste en solo
  }
  socket = ws;
  // Profil local : on le publie tout de suite (sans attendre le welcome).
  selfProfile = { id: selfProfile.id, ...profile };
  notifySelf();

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", ...profile }));
    // Publication de la position locale ~10x/s (pas de re-rendu React par frame).
    if (moveTimer) clearInterval(moveTimer);
    moveTimer = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: "move",
          x: +playerStore.position.x.toFixed(2),
          z: +playerStore.position.z.toFixed(2),
          heading: +playerStore.heading.toFixed(3),
        })
      );
    }, 100);
  };

  ws.onmessage = (ev) => {
    let m;
    try {
      m = JSON.parse(ev.data);
    } catch (e) {
      return;
    }
    if (!m || typeof m.type !== "string") return;

    if (m.type === "welcome") {
      selfId = m.id;
      selfProfile = { ...selfProfile, id: m.id };
      notifySelf();
      peers.clear();
      for (const p of m.peers || []) if (p.id !== selfId) peers.set(p.id, p);
      notifyPeers();
    } else if (m.type === "peers") {
      // Snapshot complet (join/leave/changement de statut/nom/photo).
      const present = new Set();
      for (const p of m.peers || []) {
        if (p.id === selfId) continue;
        peers.set(p.id, p);
        present.add(p.id);
      }
      for (const id of Array.from(peers.keys())) {
        if (id !== selfId && !present.has(id)) peers.delete(id);
      }
      notifyPeers();
    } else if (m.type === "peer-move") {
      const p = peers.get(m.id);
      if (p) {
        p.x = m.x;
        p.z = m.z;
        p.heading = m.heading;
      }
    } else if (m.type === "chat") {
      notifyChat(m);
    }
    notifyRaw(m);
  };

  ws.onclose = () => {
    if (moveTimer) {
      clearInterval(moveTimer);
      moveTimer = null;
    }
    // Reconnexion simple apres 2 s (utile si le serveur redemarre).
    setTimeout(() => {
      if (!socket || socket.readyState === WebSocket.CLOSED) connect(profile);
    }, 2000);
  };

  ws.onerror = () => {
    try { ws.close(); } catch (e) { /* ignore */ }
  };
}

export function disconnect() {
  if (moveTimer) {
    clearInterval(moveTimer);
    moveTimer = null;
  }
  if (socket) {
    try { socket.close(); } catch (e) { /* ignore */ }
  }
  socket = null;
  selfId = null;
  peers.clear();
  notifyPeers();
}

export function sendChat(text) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "chat", text: String(text).slice(0, 500) }));
  }
}

// Met a jour le nom / couleur / photo / statut (disponibilite) de l'avatar local.
export function updatePresence(patch) {
  if (patch && typeof patch === "object") {
    // Mise a jour locale immediate (l'etiquette 3D se rafraichit sans attendre
    // le aller-retour serveur).
    selfProfile = { ...selfProfile, ...patch };
    notifySelf();
  }
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "presence", ...patch }));
  }
}

export default {
  connect,
  disconnect,
  getPeers,
  getPeer,
  getSelfId,
  getSelfProfile,
  isConnected,
  onPeersChange,
  onSelfChange,
  onChat,
  onRaw,
  sendChat,
  sendRaw,
  updatePresence,
};
