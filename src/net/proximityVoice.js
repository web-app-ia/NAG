// ===========================================================================
// Voix de proximite via Agora (chargement PARESSEUX + entierement securise).
//
// Deux modes :
//  - HALL (canal par defaut "prox-voice-demo") : on n'entend les autres que
//    s'ils sont proches (mute automatique par distance <= PROXIMITY). C'est la
//    "conversation spontanee" au rapprochement.
//  - SESSION VERROUILLEE : quand on rejoint une conversation verrouillee, le
//    canal devient "lock-<id>" (prive au groupe). La voix y est ENTIEREMENT
//    privee : on joue tous les flux du canal, sans mute par distance.
//
// Chaque pair annonce son UID Agora (numerique) au serveur temps reel ; on
// relie ainsi un flux Agora distant a la POSITION d'un avatar pour le mute
// par distance (mode HALL uniquement).
//
// Securite : AUCUNE erreur ne doit faire planter la page de visite. Tout est
// try/catch ; si Agora echoue (token maquette, pas de micro, hors-ligne...),
// on degrade proprement et l'UI affiche "audio indisponible".
// ===========================================================================
import playerStore from "components/AvatarCustomization/playerStore";
import * as mp from "net/multiplayer";

// Rayon de proximite (mode HALL) : identique a server.ts -> PROXIMITY = 12.
const PROXIMITY = 12;
// App ID Agora (identique a src/views/liveStream.js).
const APP_ID = "2ce678e703a841f185e2e312a9bdf2e0";
// Canal vocal par defaut du hall.
const CHANNEL = "prox-voice-demo";

let AgoraRTC = null;
let client = null;
let localAudioTrack = null;
let joined = false;
let starting = false;
let micOn = false;
let micWanted = false; // etat micro souhaite (conserve le changement de canal)
let errorState = null;
let activeChannel = CHANNEL; // canal Agora courant (HALL ou lock-<id>)
let outputMuted = false; // sortie audio coupee (tous les flux distants muets)
// uid Agora (numerique) -> { audioTrack, muted }
const remoteUsers = new Map();
// Zones audio 3D des stands (coordonnees MONDE {x,z,r}). Dans une de ces zones,
// la voix de proximite porte jusqu'au rayon de la zone (au lieu de PROXIMITY).
let zones = [];

// Annonce notre UID Agora aux autres pairs (pour qu'ils nous mute/active
// selon notre distance a eux, en mode HALL).
function announceUid(uid) {
  if (uid != null) {
    try { mp.updatePresence({ agoraUid: String(uid) }); } catch (e) { /* ignore */ }
  }
}

// Met a jour les zones audio 3D des stands (coordonnees monde). Appele par le
// hall quand l'habillage des stands change.
export function setZones(list) {
  zones = Array.isArray(list) ? list : [];
}

// Rayon de proximite EFFECTIF : si le joueur est dans une zone audio de stand,
// on retient le rayon de cette zone (plus large) ; sinon le rayon par defaut.
function effRadius() {
  const me = playerStore.position;
  let r = PROXIMITY;
  for (const z of zones) {
    if (!z) continue;
    const d = Math.hypot(me.x - (z.x || 0), me.z - (z.z || 0));
    if (d <= (z.r || 0)) r = Math.max(r, z.r || 0);
  }
  return r;
}

// Recalcule le mute par distance pour chaque flux audio distant connu.
// En mode SESSION VERROUILLEE (activeChannel != CHANNEL), on joue tout le canal
// (voix privee au groupe, sans mute par distance).
function recomputeMute() {
  if (!joined) return;
  const locked = activeChannel !== CHANNEL;
  const me = playerStore.position;
  for (const [uid, rec] of remoteUsers) {
    let shouldMute = true;
    if (outputMuted) {
      shouldMute = true;
    } else if (locked) {
      shouldMute = false;
    } else {
      let peer = null;
      for (const p of mp.getPeers()) {
        if (p.agoraUid != null && String(p.agoraUid) === String(uid)) {
          peer = p;
          break;
        }
      }
      if (peer) {
        const d = Math.hypot(peer.x - me.x, peer.z - me.z);
        shouldMute = d > effRadius();
      }
    }
    if (rec.audioTrack && rec.muted !== shouldMute) {
      try {
        rec.audioTrack.setMuted(shouldMute);
        rec.muted = shouldMute;
      } catch (e) {
        /* ignore */
      }
    }
  }
}

// Rejoint la voice channel Agora courante (charge le SDK a la volee) et publie le micro.
export async function startVoice() {
  if (joined || starting) return state();
  starting = true;
  errorState = null;
  try {
    const mod = await import("agora-rtc-sdk-ng");
    AgoraRTC = mod.default || mod;
    if (!AgoraRTC || typeof AgoraRTC.createClient !== "function") {
      throw new Error("SDK Agora introuvable");
    }
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    client.on("user-published", async (user, mediaType) => {
      if (mediaType !== "audio") return;
      try {
        await client.subscribe(user, mediaType);
        if (!user.audioTrack) return;
        user.audioTrack.play();
        remoteUsers.set(user.uid, { audioTrack: user.audioTrack, muted: true });
        user.audioTrack.setMuted(true);
        recomputeMute();
      } catch (e) {
        /* ignore un abonnement defaillant */
      }
    });
    client.on("user-unpublished", (user) => {
      remoteUsers.delete(user.uid);
    });
    client.on("user-left", (user) => {
      remoteUsers.delete(user.uid);
    });

    // Jeton : on demande au serveur (endpoint maquette coherent avec le reste).
    let token = null;
    try {
      const r = await fetch("/api/agora/rtctoken", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ channel: activeChannel }),
      });
      if (r.ok) {
        const d = await r.json();
        token = d.token || null;
      }
    } catch (e) {
      /* pas de jeton -> le join echouera proprement plus bas */
    }

    const uid = await client.join(APP_ID, activeChannel, token, null);
    announceUid(uid);
    joined = true;

    // Micro local : on le cree et on le publie, dans l'etat souhaite (micWanted).
    try {
      localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await client.publish(localAudioTrack);
      localAudioTrack.setEnabled(micWanted);
      micOn = micWanted;
    } catch (micErr) {
      // Pas de micro (permission refusee ou peripherique absent) : on peut
      // tout de meme RECEVOIR la voix des autres. On le signale gentiment.
      errorState = "Micro indisponible : " + String(micErr && micErr.message || micErr);
    }
  } catch (e) {
    errorState = String((e && e.message) || e);
    joined = false;
    client = null;
  } finally {
    starting = false;
  }
  return state();
}

// Bouton micro : active/coupe le micro local. S'il n'y a pas encore de
// connexion vocale, on la demarre d'abord.
export async function toggleMic() {
  const newMic = !micOn;
  micWanted = newMic;
  if (!joined) {
    const s = await startVoice();
    if (!s.joined) return state();
  }
  if (!localAudioTrack) {
    return state();
  }
  micOn = newMic;
  try {
    localAudioTrack.setEnabled(micOn);
  } catch (e) {
    /* ignore */
  }
  return state();
}

// Change le canal Agora courant (HALL <-> session verrouillee). Si on est deja
// connecte, on reconnecte sur le nouveau canal en conservant l'etat micro.
export function setVoiceChannel(ch) {
  const next = ch && String(ch).length ? String(ch) : CHANNEL;
  if (next === activeChannel) return;
  activeChannel = next;
  if (joined || starting) {
    const wasOn = micWanted;
    stopVoice();
    startVoice().then(() => {
      if (wasOn && localAudioTrack) {
        try {
          localAudioTrack.setEnabled(true);
          micOn = true;
        } catch (e) {
          /* ignore */
        }
      }
    });
  }
}

// Quitte la voice channel et libere le micro (deconnexion de la page, etc.).
export function stopVoice() {
  try {
    if (localAudioTrack) {
      localAudioTrack.close();
      localAudioTrack = null;
    }
  } catch (e) {
    /* ignore */
  }
  try {
    if (client) client.leave();
  } catch (e) {
    /* ignore */
  }
  client = null;
  joined = false;
  micOn = false;
  starting = false;
  remoteUsers.clear();
}

// Tick periodique (appelle depuis l'UI) : recalcule le mute par distance
// au fil des deplacements des avatars (mode HALL).
export function tick() {
  recomputeMute();
}

// Coupe/reactive la SORTIE audio (tous les flux distants). Le micro local n'est
// pas affecte : on continue d'emettre, on n'entend simplement plus les autres.
export function setAudioOutputMuted(muted) {
  outputMuted = !!muted;
  recomputeMute();
  return state();
}

export function isAudioOutputMuted() {
  return outputMuted;
}

export function state() {
  return {
    joined,
    micOn,
    starting,
    error: errorState,
    remoteCount: remoteUsers.size,
    channel: activeChannel,
    outputMuted,
  };
}

export default { startVoice, toggleMic, setVoiceChannel, stopVoice, tick, state, setZones, setAudioOutputMuted, isAudioOutputMuted };
