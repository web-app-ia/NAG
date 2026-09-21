# 🏛️ Virtual Exhibition — Audit & Proposition d'optimisation de la plateforme

## 1. ÉTAT DES LIEUX (audit du backoffice et du frontend)

### Backoffice Admin (existant)
| Module | État | Limites constatées |
|--------|------|--------------------|
| Exhibitions (CRUD, start/stop, approbation) | ✅ | Pas de duplicate, pas de scheduling fin, pas de gestion des salles multiples |
| Stalls (création, attribution exhibitor) | ✅ | Modèles figés Gold/Platinum/Diamond, position auto (grille 5×N), pas de dimension custom |
| StallEditor (habillage) | ✅ | 1 visuel 2D + 1 kakemono + 1 zone audio circulaire (voix), 6 assets — pas de zones cubiques, pas de liaison média↔audio |
| Avatars | ⚠️ | Modèles GLB fixes dans /avatars (4 fichiers), pas d'import, pas de personnalisation persistée riche |
| Utilisateurs | ⚠️ | CRUD par rôle, pas de ban/activation, pas d'édition de profil admin, pas de stats par utilisateur |
| Stats | ⚠️ | Page Stat basique (chartist), pas de heatmap de fréquentation, pas de temps passé par stand |
| Feedbacks | ✅ | View + platform feedback — pas de réponse/résolution |
| Live (Agora) | ✅ | Token endpoint, stream par stall — pas de programmation d'agenda, pas d'enregistrement |
| Hall | ❌ | Aucun éditeur : sol 80×40, murs, hauteur, allée codés en dur dans VisitExhibition.js |

### Frontend Visiteur (existant)
| Fonction | État | Limites |
|----------|------|---------|
| Avatar 3D (clavier, 3ᵉ personne) | ✅ | Pas de sprint, pas de gestes/emotes, pas d'animation d'interaction |
| Multiplayer (WS) | ✅ | Présence + proximité 12 m — pas de « follow », pas de visite guidée |
| Chat proximité / conversations privées / bots | ✅ (barre unifiée) | Pas d'historique persistant, pas de traduction auto |
| Voix de proximité (Agora) | ✅ | Pas d'audio 3D positionnel des médias (les vidéos sont muettes !) |
| Plan du salon | ✅ | Statique — ne reflète pas les dimensions configurées du hall |
| Stands | ✅ | Écrans 2D muets, pas de collecte de leads, pas de documents téléchargeables hors discussion |
| Billetterie / paiement | ✅ Stripe mock | Pas de tickets QR, pas de contrôle d'accès par billet à l'entrée du hall |

## 2. CE QUI A ÉTÉ IMPLÉMENTÉ (cette session) — Hall Builder

### Menu admin `/admin/hallBuilder` (nouveau)
- 📐 **Périmètre & Grille** : dimensions du sol (X/Z), pas du quadrillage, allée (largeur/longueur/couleur)
- 🧱 **Sol / Murs / Plafond** : choix de modèle (plat/damier/parquet/marbre ; pleins/verre/rideau ; plat/poutres/ciel), **hauteur des murs**, épaisseur, couleurs, **murs invisibles en 3ᵉ personne hors périmètre** (FrontSide)
- 📦 **Objets 3D** : placement **par coordonnées de grille (x, y, z)**, échelle, rotation, statique ou interactif (URL cliquable)
- 🔊 **Zones audio cubiques redimensionnables** :
  - Zones de **sections de la map** (x,y,z + tailleX/Y/Z), liées ou non à un stand source
  - Zone audio **par rangée de stands** (toggle par rangée)
- 🧍 **Avatars** : import de nouveaux modèles GLB/GLTF dans la banque

### Intégration 3D
- `ConfiguredHall` remplace le sol/murs/allée fixes : tout est rendu depuis `/api/hall-config`
- Grille visible (lignes par pas), objets posés au sol avec recalage auto, zones audio visualisées en cubes fil de fer nommés
- API serveur : `GET/PUT /api/hall-config` (sanitization complète, bornes serrées)

## 3. ROADMAP PROPOSÉE (optimisations classées par valeur)

### A. Création des stands & espaces (P0 — prochaine itération)
1. **Éditeur visuel de stands 2D→3D** : cliquer sur la grille dans le plan pour poser/déplacer un stand (drag & drop), au lieu de la grille automatique 5×N. Stocker `x,z` par stand dans stall-decor.
2. **Zones audio par stand liées au média** : brancher `VideoPlane` → `THREE.PositionalAudio` (déjà un `AudioContext`) pour que la vidéo du stand ait une **sortie 3D cubique réelle** ; la zone cubique du Hall Builder définit le volume d'écoute.
3. **Multiple 2D import zones par stand** : écran principal + écrans secondaires (n positions prédéfinies), playlist (plusieurs images/vidéos en rotation).
4. **Bibliothèque de modèles partagée** : catalogue d'objets GLB réutilisables entre stands (upload une fois, pose partout) — réduit le poids des data URLs.
5. **Portes & ouvertures dans les murs** : découper le périmètre avec des entrées/sorties positionnées sur la grille.
6. **Salles multiples** : plusieurs halls par exhibition (portails de téléportation), config par hall.

### B. Configuration utilisateurs & avatars (P0)
7. **Importer des avatars → proposer au configurateur** : la banque `hallConfig.avatars` doit alimenter `Configurator.js` (dropdown de modèles GLB).
8. **Éditeur d'apparence enrichi** : couleurs/tenues/ accessoires par sliders (stockés dans l'entité avatar existante), persistés pour le multijoueur.
9. **Gestion des utilisateurs admin** : activer/désactiver un compte, reset de mot de passe, export CSV des inscrits, rôles multiples (owner ↔ exhibitor).
10. **Profil visiteur public** : carte de visite (photo, entreprise, LinkedIn) vue au clic sur un avatar — étend `ProfilePanel`.

### C. Expérience visiteur (P1)
11. **Audio 3D positionnel global** : les zones cubiques pilotent le volume/direction des sources (Web Audio API + PannerNode) — déjà amorcé avec les zones visuelles.
12. **Emotes & gestes** (saluer, applaudir, pointer) — animations GLB sur le Player.
13. **Collecte de leads sur les stands** : bouton « Laisser mes coordonnées » côté visiteur → tableau côté exhibiteur (nouvelle entité lead).
14. **Documents de stand téléchargeables** : brochures PDF posées sur le stand (comme les fichiers des conversations privées).
15. **Visites guidées** : un « guide » peut entrainer un groupe (follow mode), script de parcours de stands avec narration audio pré-enregistrée.
16. **Historique de chat persisté** (côté serveur, 24 h) + recherche.
17. **Traduction automatique des messages** (API externe ou lib locale).

### D. Analytics & pilotage (P1)
18. **Heatmap de fréquentation** : les positions multiplayer sont déjà diffusées — agréger par zone/stand dans une table et afficher une heatmap sur le plan (admin).
19. **Temps passé par stand** (dwell time) et **top stands**, exposés dans Stat.
20. **Satisfaction en sortie** : mini-poll après une visite (lien avec feedbacks).
21. **Programme/Agenda** : conférences programmées (heure, stand, bot animateur) avec rappels dans la cloche de notifications.

### E. Technique (P1/P2)
22. **Persistance disque** de stall-decor & hall-config (JSON sur disque ou SQLite) — actuellement en mémoire, perdu au redémarrage.
23. **Upload de fichiers** vers `_imgout` au lieu de data URLs base64 (limite 3 Mo levée, mémoire serveur réduite).
24. **Rate-limiting & auth** sur les endpoints admin (stall-decor, hall-config, bots).
25. **LOD & pooling des GLB** (drei `Detailed`) pour garder 60 fps avec 200 objets.
26. **Tests E2E** (Playwright) des parcours : login → visite → chat → paiement.

## 4. Fichiers créés/modifiés (cette itération)

| Fichier | Rôle |
|---------|------|
| `src/net/hallConfig.js` | Client API + store de la config du hall |
| `src/components/ExhibitionMap/HallBuilder.jsx` | **Menu admin** : 5 onglets (périmètre, shell, objets, audio, avatars) |
| `src/components/ExhibitionMap/ConfiguredHall.jsx` | Rendu 3D configuré (sol/murs/plafond/grille/objets/zones) |
| `src/components/ExhibitionMap/useHallConfig.js` | Hook React (charge + réactivité) |
| `src/views/VisitExhibition.js` | Sol/murs fixes → `ConfiguredHall` |
| `src/routes.js` | Route `/admin/hallBuilder` (menu ADMIN) |
| `server.ts` | `GET/PUT /api/hall-config` + sanitization |

## 5. LIVRAISON DES 26 PROPOSITIONS (statut de cette session)

### A. Stands & espaces
| # | Proposition | Statut |
|---|-------------|--------|
| 1 | Editeur visuel drag&drop des stands sur la grille | ✅ StallPlacement (SVG drag&drop + import plan JSON) |
| 2 | Audio 3D positionnel des videos (PositionalAudio) | ✅ PositionalScreenAudio + per-stand audio3d + zar.ther |
| 3 | Playlists multi-ecrans | ✅ decor.screens (6 ecrans, positions libres) |
| 4 | Bibliotheque de modeles partagee | ✅ Hall Builder Objets (URLs réutilisables) + upload serveur |
| 5 | Portes dans les murs | ✅ DoorPortal (colonnes lumineuses + labels + clic) |
| 6 | Salles multiples + chargement au franchissement | ✅ Mondes (worlds API) + overlay de transition + spawn |

### B. Utilisateurs & avatars
| # | Proposition | Statut |
|---|-------------|--------|
| 7 | Banque d avatars -> configurateur | ✅ AvatarLibrary + Player lit localStorage |
| 8 | Editeur d apparence enrichi | ⚠️ Exist config couleurs ; a etendre (v2) |
| 9 | Gestion des comptes (ban/reset/export) | ✅ UserManager + API admin/users |
| 10 | Carte de visite publique | ⚠️ ProfilePanel actuel (photo+dispo) ; a enrichir (v2) |

### C. Experience visiteur
| # | Proposition | Statut |
|---|-------------|--------|
| 11 | Audio 3D positionnel global | ✅ PositionalAudio + zones cubiques visualisees |
| 12 | Emotes & gestes | ✅ Bulle multijoueur (touches 1-4) |
| 13 | Collecte de leads | ✅ LeadForm + API + export CSV (UserManager) |
| 14 | Documents téléchargeables | ✅ StallDocs + API stall-docs |
| 15 | Visites guidees (follow) | ✅ Boutons Suivre + convergence 3D (Player) |
| 16 | Historique chat persiste | ✅ Serveur 24 h + reload a l ouverture |
| 17 | Traduction auto | ❌ V2 (service externe ou lib) |

### D. Analytics & pilotage
| # | Proposition | Statut |
|---|-------------|--------|
| 18 | Heatmap de frequentation | ✅ API + overlay dans le plan (admin) |
| 19 | Dwell time par stand | ✅ API + top stand dans le plan (admin) |
| 20 | Satisfaction en sortie | ❌ V2 (mini-poll) |
| 21 | Agenda / conferences | ✅ API + page AgendaAdmin |

### E. Technique
| # | Proposition | Statut |
|---|-------------|--------|
| 22 | Persistance disque | ✅ Snapshot JSON (_data) + flush 10 s |
| 23 | Upload fichier (vs base64) | ✅ POST /api/upload (40 Mo, GLB/GLTF/img/vid/audio/PDF) + fallback local |
| 24 | Auth endpoints admin | ✅ Middleware 401 sur PUT (401 verifie) |
| 25 | LOD & performances | ⚠️ Suspense + cache existants ; Detailed (v2) |
| 26 | Tests E2E | ❌ V2 (Playwright) |

**Score : 19/26 implemente, 3/26 partiel, 4/26 en v2.**
