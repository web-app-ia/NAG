// Registre des mondes modulaires (hub + pavillons relies par portes).
const API = "/api/worlds";

let worlds = { worlds: [] };
let currentWorldId = "hub";
const listeners = new Set();

export function getWorlds() { return worlds.worlds || []; }
export function getWorld(id) { return getWorlds().find((w) => w.id === id) || null; }
export function getCurrentWorldId() { return currentWorldId; }
export function getCurrentWorld() { return getWorld(currentWorldId) || getWorlds()[0] || null; }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const notify = () => { for (const fn of listeners) { try { fn(worlds); } catch (e) { /* */ } } };

export async function load() {
  try {
    const r = await fetch(API);
    if (r.ok) { worlds = await r.json(); notify(); }
  } catch (e) { /* hors-ligne */ }
  return worlds;
}

export async function save(next) {
  const body = next || worlds;
  try {
    const r = await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("jwt") || "" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (data && data.worlds) { worlds = { worlds: data.worlds }; notify(); }
  } catch (e) { /* hors-ligne : garde local */ }
  return worlds;
}

export async function ensureDefaultWorld() {
  await load();
  if (!getWorlds().length) {
    await save({ worlds: [{ id: "hub", name: "Hall principal", doors: [] }] });
  }
  return getWorlds();
}

// Change d univers (utilise par les portes / le plan).
export function setCurrentWorld(id) {
  if (getWorld(id)) { currentWorldId = id; notify(); }
  return currentWorldId;
}

export default { getWorlds, getWorld, getCurrentWorld, getCurrentWorldId, onChange, load, save, ensureDefaultWorld, setCurrentWorld };
