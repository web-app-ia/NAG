// Magasin partage (hors React) entre le joueur 3D et l'interface 2D (plan, chat...).
//
// Pourquoi ne pas utiliser un state React ? La position du joueur change a
// chaque frame (60x/s) : un setState par frame re-rendrait toute la vue.
// Ici on ecrit/on lit des valeurs mutables, sans aucun re-rendu.
//
// Usage :
//   - Player.jsx  : publie position + cap, et consomme les demandes de teleportation.
//   - Le plan (ExhibitionMap) : lit la position pour dessiner "vous etes ici"
//     et appelle requestTeleport() quand on clique une destination.

export const playerStore = {
  // Position au sol de l'avatar (repere monde).
  position: { x: 0, z: 0 },
  // Cap du corps en radians (0 = +Z).
  heading: 0,
  // Mode de vue courant : "tps" | "fps".
  viewMode: "tps",
  // Demande de teleportation en attente : { x, z, heading } ou null.
  teleportRequest: null,
  // Visite guidee (follow mode) : id du pair suivi, ou null.
  followId: null,

  setFollow(id) {
    this.followId = id || null;
  },

  requestTeleport(x, z, heading) {
    this.teleportRequest = { x, z, heading };
  },

  consumeTeleport() {
    const r = this.teleportRequest;
    this.teleportRequest = null;
    return r;
  },
};

export default playerStore;
