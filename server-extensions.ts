// ===========================================================================
// EXTENSIONS SERVEUR : mondes modulaires, upload, auth admin, leads, docs,
// analytics (heatmap/dwell), historique de chat, gestion de comptes, agenda,
// persistance disque. Enregistre via registerExtensions(app, deps).
// ===========================================================================
import fs from "fs";
import path from "path";

const clampNum = (v: any, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const PERSIST_DIR = path.join(process.cwd(), "_data");
if (!fs.existsSync(PERSIST_DIR)) fs.mkdirSync(PERSIST_DIR, { recursive: true });
const UPLOAD_DIR = path.join(process.cwd(), "_imgout", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export function registerExtensions(app: any, deps: any) {
  const stallDecor: Map<string, any> = deps.stallDecor;
  const getHallConfig = deps.getHallConfig;
  const setHallConfig = deps.setHallConfig;
  const getPeers = deps.getPeers;

  // ---------------- MONDES MODULAIRES ----------------
  const worldsStore: { current: any } = { current: { worlds: [] } };

  function sanitizeWorld(w: any) {
    if (!w || typeof w !== "object") return null;
    const id = typeof w.id === "string" && w.id ? w.id.slice(0, 40) : "";
    if (!id) return null;
    const out: any = {
      id,
      name: typeof w.name === "string" ? w.name.slice(0, 80) : id,
      // Paysage importe (GLB concu dans Blender/SketchUp/...) : optionnel. Si
      // absent, le hall est genere depuis floor/walls (ConfiguredHall).
      landscapeUrl: typeof w.landscapeUrl === "string" ? w.landscapeUrl.slice(0, 300) : "",
      floor: w.floor && typeof w.floor === "object"
        ? { sizeX: clampNum(w.floor.sizeX, 10, 500), sizeZ: clampNum(w.floor.sizeZ, 10, 500), color: typeof w.floor.color === "string" ? w.floor.color.slice(0, 20) : "#1a2340" }
        : { sizeX: 80, sizeZ: 40, color: "#1a2340" },
      walls: w.walls && typeof w.walls === "object"
        ? { height: clampNum(w.walls.height, 2, 60), color: typeof w.walls.color === "string" ? w.walls.color.slice(0, 20) : "#11182f", invisibleForTPS: !!w.walls.invisibleForTPS }
        : { height: 12, color: "#11182f", invisibleForTPS: true },
      standPositions: {},
      objects: Array.isArray(w.objects) ? w.objects.slice(0, 200) : [],
      globalAudioZones: Array.isArray(w.globalAudioZones) ? w.globalAudioZones.slice(0, 50) : [],
      doors: (Array.isArray(w.doors) ? w.doors : []).slice(0, 20).map((d: any, i: number) => {
        if (!d || typeof d !== "object") return null;
        const tid = typeof d.targetWorldId === "string" ? d.targetWorldId.slice(0, 40) : "";
        if (!tid) return null;
        return {
          id: typeof d.id === "string" && d.id ? d.id.slice(0, 40) : `door-${i + 1}`,
          label: typeof d.label === "string" ? d.label.slice(0, 60) : "",
          x: clampNum(d.x, -250, 250),
          z: clampNum(d.z, -250, 250),
          width: clampNum(d.width, 1, 30),
          height: clampNum(d.height, 1, 30),
          targetWorldId: tid,
          spawnX: clampNum(d.spawnX, -250, 250),
          spawnZ: clampNum(d.spawnZ, -250, 250),
          spawnHeading: clampNum(d.spawnHeading, -Math.PI, Math.PI),
        };
      }).filter(Boolean),
    };
    if (w.standPositions && typeof w.standPositions === "object") {
      const sp: any = {};
      for (const k of Object.keys(w.standPositions).slice(0, 200)) {
        const v = w.standPositions[k];
        if (!v || typeof v !== "object") continue;
        sp[k.slice(0, 60)] = { x: clampNum(v.x, -250, 250), z: clampNum(v.z, -250, 250), rotY: clampNum(v.rotY, -180, 180) };
      }
      out.standPositions = sp;
    }
    return out;
  }

  app.get("/api/worlds", (_req: any, res: any) => res.json(worldsStore.current));
  app.get("/api/worlds/:worldId", (req: any, res: any) => {
    const w = (worldsStore.current.worlds || []).find((x: any) => x.id === req.params.worldId);
    res.json(w || {});
  });
  app.put("/api/worlds", (req: any, res: any) => {
    const body = req.body || {};
    const list = Array.isArray(body.worlds) ? body.worlds : [];
    worldsStore.current = { worlds: list.map(sanitizeWorld).filter(Boolean) };
    dirty.add("worlds");
    res.json({ status: "success", ...worldsStore.current });
  });

  // ---------------- UPLOAD DE FICHIERS (multipart 1 fichier, 40 Mo) ------
  const ALLOWED_EXT = /\.(glb|gltf|png|jpe?g|gif|webp|mp4|webm|mp3|wav|ogg|pdf)$/i;
  const MAX_UPLOAD = 40 * 1024 * 1024;
  app.post("/api/upload", (req: any, res: any) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_UPLOAD + 1_000_000) { aborted = true; try { req.destroy(); } catch (e) { /* */ } return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (aborted || res.headersSent) return;
      try {
        const buf = Buffer.concat(chunks);
        const ct = String(req.headers["content-type"] || "");
        const bm = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!bm) return res.status(400).json({ status: "error", message: "multipart requis" });
        const boundary = Buffer.from("--" + (bm[1] || bm[2]).trim());
        let idx = buf.indexOf(boundary);
        while (idx !== -1) {
          const headersEnd = buf.indexOf(Buffer.from("\r\n\r\n"), idx);
          if (headersEnd === -1) break;
          const headerBlock = buf.slice(idx, headersEnd).toString("utf8");
          const fnm = headerBlock.match(/filename="([^"]+)"/i);
          const next = buf.indexOf(boundary, headersEnd);
          if (fnm) {
            const orig = path.basename(fnm[1]);
            if (!ALLOWED_EXT.test(orig)) return res.status(400).json({ status: "error", message: "Type non autorise" });
            let end = next === -1 ? buf.length : next;
            if (end > headersEnd + 4 && buf[end - 2] === 13 && buf[end - 1] === 10) end -= 2;
            const body = buf.slice(headersEnd + 4, end);
            const safe = orig.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
            const dest = path.join(UPLOAD_DIR, Date.now().toString(36) + "-" + safe);
            fs.writeFileSync(dest, body);
            return res.json({ status: "success", url: "/_imgout/uploads/" + path.basename(dest), size: body.length });
          }
          idx = next;
        }
        res.status(400).json({ status: "error", message: "Aucun fichier" });
      } catch (e) {
        try { res.status(500).json({ status: "error" }); } catch (e2) { /* */ }
      }
    });
    req.on("error", () => { /* ignore */ });
  });

  // (middleware AUTH ADMIN central dans server.ts, enregistre avant les
  // routes concernees : rien a ajouter ici.)
  // ---------------- LEADS + export CSV -----------------------------------
  const leads: any[] = [];
  app.post("/api/leads", (req: any, res: any) => {
    const b = req.body || {};
    const lead = {
      id: "lead-" + Date.now().toString(36),
      stallId: String(b.stallId || "").slice(0, 60),
      exhibitionId: String(b.exhibitionId || "").slice(0, 60),
      name: String(b.name || "").slice(0, 80),
      email: String(b.email || "").slice(0, 120),
      company: String(b.company || "").slice(0, 120),
      message: String(b.message || "").slice(0, 500),
      ts: Date.now(),
    };
    if (!lead.stallId || !lead.email) return res.status(400).json({ status: "error" });
    leads.push(lead);
    if (leads.length > 5000) leads.shift();
    res.json({ status: "success", lead });
  });
  app.get("/api/leads", (req: any, res: any) => {
    let out = leads;
    if (req.query.stallId) out = out.filter((l: any) => l.stallId === req.query.stallId);
    if (req.query.exhibitionId) out = out.filter((l: any) => l.exhibitionId === req.query.exhibitionId);
    res.json(out);
  });
  app.get("/api/leads/export", (_req: any, res: any) => {
    const rows = [["id", "stallId", "name", "email", "company", "message", "ts"].join(",")];
    for (const l of leads) {
      rows.push([l.id, l.stallId, l.name, l.email, l.company, String(l.message).replace(/[\n,]/g, " "), new Date(l.ts).toISOString()].map((v) => `"${v}"`).join(","));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=leads.csv");
    res.send(rows.join("\n"));
  });

  // ---------------- BROCHURES / DOCUMENTS DE STAND -----------------------
  const stallDocs = new Map<string, any[]>();
  app.get("/api/stall-docs/:stallId", (req: any, res: any) => res.json(stallDocs.get(req.params.stallId) || []));
  app.put("/api/stall-docs/:stallId", (req: any, res: any) => {
    const list = Array.isArray(req.body && req.body.docs) ? req.body.docs : [];
    const out = list.slice(0, 12).map((d: any, i: number) => ({
      id: typeof d.id === "string" && d.id ? d.id.slice(0, 40) : `doc-${i + 1}`,
      name: String(d.name || "Document").slice(0, 80),
      url: String(d.url || "").slice(0, 300),
    })).filter((d: any) => d.url);
    stallDocs.set(req.params.stallId, out);
    res.json({ status: "success", docs: out });
  });

  // ---------------- ANALYTICS : heatmap + dwell time ---------------------
  // Les positions des peers arrivent via les WS updates (info.x/z). Un timer
  // agregue toutes les 5 s : hits par cellule de 4x4 m et secondes par stand
  // (un peer annonce nearStallId via updatePresence).
  const heatmap = new Map<string, number>();
  const dwell = new Map<string, number>();
  const timer = setInterval(() => {
    for (const p of getPeers().values()) {
      if (typeof p.info.x !== "number" || typeof p.info.z !== "number") continue;
      const cx = Math.round(p.info.x / 4), cz = Math.round(p.info.z / 4);
      const key = cx + "," + cz;
      heatmap.set(key, (heatmap.get(key) || 0) + 1);
      if (p.info.nearStallId) dwell.set(p.info.nearStallId, (dwell.get(p.info.nearStallId) || 0) + 5);
    }
  }, 5000);
  timer.unref();

  app.get("/api/analytics/heatmap", (_req: any, res: any) => {
    const cells: any[] = [];
    for (const [k, v] of heatmap.entries()) {
      const parts = k.split(",");
      cells.push({ x: Number(parts[0]) * 4, z: Number(parts[1]) * 4, hits: v });
    }
    res.json({ cells });
  });
  app.get("/api/analytics/dwell", (_req: any, res: any) => {
    const out: any[] = [];
    for (const [stallId, secs] of dwell.entries()) out.push({ stallId, seconds: secs });
    out.sort((a, b) => b.seconds - a.seconds);
    res.json(out);
  });

  // ---------------- HISTORIQUE DE CHAT (24 h glissantes) ----------------
  const chatHistory: any[] = [];
  deps.pushChat = (entry: any) => {
    chatHistory.push({ ...entry, ts: Date.now() });
    if (chatHistory.length > 2000) chatHistory.shift();
  };
  app.get("/api/chat-history", (_req: any, res: any) => {
    const cutoff = Date.now() - 24 * 3600 * 1000;
    res.json(chatHistory.filter((m) => m.ts >= cutoff).slice(-200));
  });

  // ---------------- GESTION DES COMPTES (admin) -------------------------
  const banned = new Set<string>();
  app.get("/api/admin/users", (_req: any, res: any) => {
    // Comptes du mock db + fichiers JSON de roles s ils existent dans _data.
    const out: any[] = [];
    const seen = new Set<string>();
    const push = (role: string, list: any[]) => {
      for (const u of list || []) {
        const email = String(u.email || u.emailAddress || "");
        if (!email || seen.has(email)) continue;
        seen.add(email);
        out.push({ role, name: u.name || u.fullName || "", email, banned: banned.has(email.toLowerCase()) });
      }
    };
    if (deps.mockUsers) push("ADMIN", deps.mockUsers);
    for (const role of ["Admin", "Attendee", "Exhibitor", "ExhibitionOwner"]) {
      try {
        const f = path.join(PERSIST_DIR, role + ".json");
        if (fs.existsSync(f)) push(role, JSON.parse(fs.readFileSync(f, "utf8")));
      } catch (e) { /* ignore */ }
    }
    res.json(out);
  });
  app.post("/api/admin/users/ban", (req: any, res: any) => {
    const email = String((req.body || {}).email || "").toLowerCase();
    if (!email) return res.status(400).json({ status: "error" });
    banned.add(email);
    res.json({ status: "success" });
  });
  app.post("/api/admin/users/unban", (req: any, res: any) => {
    banned.delete(String((req.body || {}).email || "").toLowerCase());
    res.json({ status: "success" });
  });
  app.post("/api/admin/users/resetPassword", (req: any, res: any) => {
    const email = String((req.body || {}).email || "");
    const temp = "Temp" + Math.random().toString(36).slice(2, 10) + "!";
    // Maquette : en production, envoi par email (forgotPassword existe deja).
    res.json({ status: "success", email, tempPassword: temp });
  });

  // ---------------- AGENDA DES CONFERENCES ------------------------------
  const agenda: any[] = [];
  app.get("/api/agenda/:exhibitionId", (req: any, res: any) => {
    res.json(agenda.filter((a) => a.exhibitionId === req.params.exhibitionId));
  });
  app.post("/api/agenda", (req: any, res: any) => {
    const b = req.body || {};
    const item = {
      id: "ag-" + Date.now().toString(36),
      exhibitionId: String(b.exhibitionId || "").slice(0, 60),
      title: String(b.title || "Conference").slice(0, 120),
      stallId: String(b.stallId || "").slice(0, 60),
      startsAt: Number(b.startsAt) || Date.now(),
      durationMin: Math.max(5, Math.min(480, Number(b.durationMin) || 30)),
      speaker: String(b.speaker || "").slice(0, 80),
    };
    agenda.push(item);
    res.json({ status: "success", item });
  });
  app.delete("/api/agenda/:id", (req: any, res: any) => {
    const i = agenda.findIndex((a) => a.id === req.params.id);
    if (i >= 0) agenda.splice(i, 1);
    res.json({ status: "success" });
  });

  // ---------------- PERSISTANCE DISQUE (flush toutes les 10 s) ----------
  const dirty = new Set<string>();
  deps.markDirty = (name: string) => dirty.add(name);
  const flush = () => {
    for (const name of dirty) {
      try {
        if (name === "stall-decor") {
          const o: any = {};
          for (const [k, v] of stallDecor.entries()) o[k] = v;
          fs.writeFileSync(path.join(PERSIST_DIR, "stall-decor.json"), JSON.stringify(o));
        } else if (name === "hall-config") {
          fs.writeFileSync(path.join(PERSIST_DIR, "hall-config.json"), JSON.stringify(getHallConfig() || {}));
        } else if (name === "worlds") {
          fs.writeFileSync(path.join(PERSIST_DIR, "worlds.json"), JSON.stringify(worldsStore.current));
        }
      } catch (e) { /* ignore */ }
      dirty.delete(name);
    }
  };
  const flushTimer = setInterval(flush, 10_000);
  flushTimer.unref();
  deps.flush = flush;

  // Restauration au demarrage.
  try {
    const f1 = path.join(PERSIST_DIR, "stall-decor.json");
    if (fs.existsSync(f1)) {
      const data = JSON.parse(fs.readFileSync(f1, "utf8"));
      for (const k of Object.keys(data || {})) stallDecor.set(k, data[k]);
    }
    const f2 = path.join(PERSIST_DIR, "hall-config.json");
    if (fs.existsSync(f2)) setHallConfig(JSON.parse(fs.readFileSync(f2, "utf8")));
    const f3 = path.join(PERSIST_DIR, "worlds.json");
    if (fs.existsSync(f3)) worldsStore.current = JSON.parse(fs.readFileSync(f3, "utf8"));
  } catch (e) { /* snapshot corrompu : demarrage a vide */ }
}
