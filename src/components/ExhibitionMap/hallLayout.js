// Geometrie PARTAGEE du hall.
//
// Regle d'or : la scene 3D (VisitExhibition) et le plan vu de dessus
// (ExhibitionMap) doivent calculer les positions avec CES fonctions.
// Si l'un des deux recalcule la grille dans son coin, le plan finit par mentir.

// Dimensions du sol et bornes de circulation (murs de la salle).
export const HALL = {
  sizeX: 80, // planeGeometry 80 x 40
  sizeZ: 40,
  boundX: 38, // marge pour l'avatar (murs a +/-40)
  boundZ: 18, // marge pour l'avatar (murs a +/-20)
};

// Allees centrales (moquette rouge) : 9 x 36 centree sur l'origine.
export const AISLE = { width: 9, length: 36 };

// Grille des stands : 5 colonnes x N rangees, centree sur le sol.
export const STALL_COLS = 5;
export const STALL_SPACING_X = 15;
export const STALL_SPACING_Z = 9;
export const POD_RADIUS = 4.2;

/**
 * Position monde [x, z] du stand n° i sur n stands.
 * Identique a l'ancien `layout()` de VisitExhibition : ne pas modifier sans
 * verifier le rendu 3D.
 */
export function stallLayout(i, n) {
  const rows = Math.ceil(n / STALL_COLS);
  const col = i % STALL_COLS;
  const row = Math.floor(i / STALL_COLS);
  return [
    (col - (STALL_COLS - 1) / 2) * STALL_SPACING_X,
    (row - (rows - 1) / 2) * STALL_SPACING_Z,
  ];
}

/**
 * Point d'approche d'un stand : le couloir libre le plus proche.
 * On ne vise JAMAIS le centre du stand (il est occupe par son collider) mais
 * le milieu de l'allee entre deux colonnes -> la teleportation ne bloque pas.
 */
export function stallApproach(i, n) {
  const [sx, sz] = stallLayout(i, n);
  const half = STALL_SPACING_X / 2;
  const lane = sx <= 0 ? sx + half : sx - half;
  return [lane, sz];
}

/** Cap (radians) pour regarder de (fromX, fromZ) vers (toX, toZ). */
export function facingHeading(fromX, fromZ, toX, toZ) {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

/** Couleur de la plateforme selon le type de stand (3D + plan). */
export function podColor(t) {
  const k = (t || "Gold").toLowerCase();
  if (k === "platinum") return "#cfd8e3";
  if (k === "diamond") return "#7fd4e6";
  return "#e7c46b";
}

/** Zones nommees du hall (points d'arrivee libres, hors colliders). */
export function hallZones(n) {
  const rows = Math.ceil(n / STALL_COLS);
  const zones = [
    { id: "entrance", name: "Entree du salon", x: 7.5, z: 17 },
    { id: "center", name: "Allee centrale", x: 7.5, z: 0 },
    { id: "west", name: "Aile ouest", x: -22.5, z: 0 },
    { id: "east", name: "Aile est", x: 22.5, z: 0 },
  ];
  for (let r = 0; r < rows; r++) {
    const z = (r - (rows - 1) / 2) * STALL_SPACING_Z;
    const suffix = r === 0 ? " (nord)" : r === rows - 1 ? " (sud)" : "";
    zones.push({ id: `row-${r}`, name: `Rangee ${r + 1}${suffix}`, x: -7.5, z });
  }
  return zones;
}
