// ===========================================================================
// CONFIGURATION DU HALL (editeur admin "Hall Builder").
//
// Source de verite UNIQUE pour la geometrie de l exposition : dimensions du
// sol (perimetre), modeles sol/murs/plafond, hauteur des murs, murs invisibles
// (anti vue sombre en 3e personne), grille par coordonnees (x,y,z), objets 3D
// places sur la grille, zones audio cubiques (globales / par rangee / par stand),
// et banque d avatars importes.
//
// Stocke cote serveur via /api/hall-config (meme pattern que stallDecor).
// Module singleton hors React : charge une fois, cache, notifie l UI.
// ===========================================================================

const API = "/api/hall-config";

// Valeurs par defaut = la geometrie historique du hall (ne rien changer tant
// que l admin n a pas edite : la foire existante continue de marcher).
export const DEFAULT_HALL = {
  floor: { sizeX: 80, sizeZ: 40, color: "#1a2340", model: "flat" },
  walls: { height: 12, color: "#11182f", model: "box", thickness: 0.5, invisibleForTPS: true },
  ceiling: { enabled: false, height: 14, color: "#0b1020", model: "flat" },
  aisle: { width: 9, length: 36, color: "#7a1f2b" },
  grid: { step: 1, show: true },
  objects: [],       // objets 3D libres poses sur la grille
  globalAudioZones: [], // zones audio cubiques redimensionnables (sections de la map)
  rowAudioZones: {},    // rowIndex -> zone audio cubique de la rangee
  avatars: [],       // modeles d avatars importes (GLB/GLTF)
};

let config = { ...DEFAULT_HALL };
let loaded = false;
const listeners = new Set();

const notify = () => {
  for (const fn of listeners) {
    try { fn(config); } catch (e) { /* ignore */ }
  }
};

const clone = (o) => JSON.parse(JSON.stringify(o));

export function get() {
  return config;
}

export function isLoaded() {
  return loaded;
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Charge la config depuis le serveur (fallback sur les valeurs par defaut).
export async function load() {
  try {
    const r = await fetch(API);
    if (r.ok) {
      const data = await r.json();
      if (data && typeof data === "object" && Object.keys(data).length) {
        config = { ...clone(DEFAULT_HALL), ...data };
      }
      loaded = true;
      updateBounds(config);
      notify();
    }
  } catch (e) {
    /* serveur injoignable : valeurs par defaut */
  }
  return config;
}

// Sauvegarde la config complete et notifie l UI.
export async function save(next) {
  const merged = { ...clone(DEFAULT_HALL), ...(next || {}) };
  try {
    const r = await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });
    const data = await r.json();
    config = (data && data.config) || merged;
  } catch (e) {
    config = merged; // mode hors-ligne : on garde local
  }
  updateBounds(config);
  notify();
  return config;
}

// ---- Helpers de mise a jour partielle (utilises par l editeur) -------------

export async function patch(part) {
  return save({ ...config, ...part });
}

export async function addObject(obj) {
  const objects = [...(config.objects || []), obj];
  return patch({ objects });
}

export async function updateObject(id, patchObj) {
  const objects = (config.objects || []).map((o) => (o.id === id ? { ...o, ...patchObj } : o));
  return patch({ objects });
}

export async function removeObject(id) {
  const objects = (config.objects || []).filter((o) => o.id !== id);
  return patch({ objects });
}

export async function addGlobalAudioZone(zone) {
  const globalAudioZones = [...(config.globalAudioZones || []), zone];
  return patch({ globalAudioZones });
}

export async function updateGlobalAudioZone(id, patchZone) {
  const globalAudioZones = (config.globalAudioZones || []).map((z) => (z.id === id ? { ...z, ...patchZone } : z));
  return patch({ globalAudioZones });
}

export async function removeGlobalAudioZone(id) {
  const globalAudioZones = (config.globalAudioZones || []).filter((z) => z.id !== id);
  return patch({ globalAudioZones });
}

export async function setRowAudioZone(rowIndex, zone) {
  const rowAudioZones = { ...(config.rowAudioZones || {}), [rowIndex]: zone };
  return patch({ rowAudioZones });
}

export async function addAvatar(av) {
  const avatars = [...(config.avatars || []), av];
  return patch({ avatars });
}

export async function removeAvatar(id) {
  const avatars = (config.avatars || []).filter((a) => a.id !== id);
  return patch({ avatars });
}

// Bornes d'exploration LIVE des avatars : recalculees a chaque chargement /
// sauvegarde de la config (demi-dimensions du sol moins une marge pour le
// corps de l avatar et l epaisseur des murs). Player.jsx lit ces valeurs a
// chaque frame : les murs suivent la surface configuree dans le Hall Builder
// (le sol peut etre agrandi/retrci a chaud).
export const liveBounds = { x: 38, z: 18 };

function updateBounds(cfg) {
  const f = (cfg && cfg.floor) || {};
  const margin = 2; // rayon avatar + demi-epaisseur mur + garde
  liveBounds.x = Math.max(5, (f.sizeX || 80) / 2 - margin);
  liveBounds.z = Math.max(5, (f.sizeZ || 40) / 2 - margin);
}

export function getLiveBounds() {
  return liveBounds;
}

export default {
  DEFAULT_HALL,
  get, isLoaded, onChange, load, save, patch,
  addObject, updateObject, removeObject,
  addGlobalAudioZone, updateGlobalAudioZone, removeGlobalAudioZone,
  setRowAudioZone, addAvatar, removeAvatar,
  liveBounds, getLiveBounds,
};

// Bornes imposees par le monde courant (portes inter-mondes) : les mondes
// modulaires ont chacun leur surface. setLiveBounds est appele au changement
// de monde (VisitExhibition) ; les valeurs font foi pour Player/plan.
export function setLiveBounds(x, z) {
  liveBounds.x = Math.max(5, x);
  liveBounds.z = Math.max(5, z);
}