// ===========================================================================
// Bots 3D (menu admin / assistants connectes a des API externes).
//
// Un bot est un personnage du hall auquel on parle (texte ou voix) et qui
// repond (texte + voix + UI generative). Module "singleton" hors React : on
// charge la liste une fois, on garde le bot selectionne, et on expose un chat.
// ===========================================================================

let bots = [];
let selectedId = null;
const botListeners = new Set();
const selListeners = new Set();

const notifyBots = () => {
  for (const fn of botListeners) {
    try { fn(bots); } catch (e) { /* ignore */ }
  }
};
const notifySel = () => {
  for (const fn of selListeners) {
    try { fn(selectedId); } catch (e) { /* ignore */ }
  }
};

export function getBots() {
  return bots;
}

export function getSelectedId() {
  return selectedId;
}

export function selectBot(id) {
  selectedId = id || null;
  notifySel();
}

export function onBots(fn) {
  botListeners.add(fn);
  return () => botListeners.delete(fn);
}

export function onSelect(fn) {
  selListeners.add(fn);
  return () => selListeners.delete(fn);
}

export async function loadBots() {
  try {
    const r = await fetch("/api/bots");
    if (r.ok) {
      const data = await r.json();
      bots = Array.isArray(data) ? data : [];
      notifyBots();
    }
  } catch (e) {
    /* serveur injoignable : aucun bot */
  }
  return bots;
}

// Envoie un message au bot. `payload` = { text, files:[{name,size,type}], history:[...] }.
// Le serveur renvoie { reply, ui, source }.
export async function chat(botId, payload) {
  const r = await fetch(`/api/bots/${encodeURIComponent(botId)}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!r.ok) throw new Error("chat " + r.status);
  return r.json();
}

export default { getBots, getSelectedId, selectBot, onBots, onSelect, loadBots, chat };
