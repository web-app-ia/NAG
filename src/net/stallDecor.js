// ===========================================================================
// Habillage de stand (menu admin / construction de stand).
//
// Gere, par stand : le modele, le visuel 2D (image ou video), le kakemono
// (banniere verticale) et la zone audio 3D. Module "singleton" hors React :
// on charge tous les habillages une fois, on les met en cache, et on notifie
// l'UI apres une sauvegarde (le hall 3D se met a jour tout seul).
// ===========================================================================

const API = "/api/stall-decor";

let map = {}; // stallId -> decor
let loaded = false;
const listeners = new Set();

const notify = () => {
  for (const fn of listeners) {
    try { fn(map); } catch (e) { /* ignore un listener defaillant */ }
  }
};

export function getAll() {
  return map;
}

export function get(stallId) {
  return map[stallId] || null;
}

export function isLoaded() {
  return loaded;
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Charge tous les habillages depuis le serveur (une fois au montage du hall).
export async function loadAll() {
  try {
    const r = await fetch(API);
    if (r.ok) {
      const data = await r.json();
      map = data && typeof data === "object" ? data : {};
      loaded = true;
      notify();
    }
  } catch (e) {
    /* serveur injoignable : on reste sur une carte vide (hall sans habillage) */
  }
  return map;
}

// Sauvegarde l'habillage d'un stand et met a jour le cache + l'UI.
export async function save(stallId, decor) {
  const r = await fetch(`${API}/${encodeURIComponent(stallId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(decor || {}),
  });
  const data = await r.json();
  const saved = (data && data.decor) || decor || {};
  map = { ...map, [stallId]: saved };
  notify();
  return saved;
}

export default { getAll, get, isLoaded, onChange, loadAll, save };
