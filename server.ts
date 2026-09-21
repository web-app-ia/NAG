import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import fs from "fs";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory Database / Mock State
const db = {
  users: [
    {
      id: "admin-1",
      emailAddress: "admin@example.com",
      password: "password",
      name: "Admin User",
      contactNo: "+1234567890",
      nic: "991234567V",
      userRole: "ADMIN",
    },
    {
      id: "owner-1",
      emailAddress: "owner@example.com",
      password: "password",
      name: "John Owner",
      contactNo: "+1234567891",
      nic: "991234568V",
      companyName: "Tech Expo Corp",
      userRole: "EX_OWNER",
    },
    {
      id: "exhibitor-1",
      emailAddress: "exhibitor@example.com",
      password: "password",
      name: "Sarah Exhibitor",
      contactNo: "+1234567892",
      nic: "991234569V",
      companyName: "Innovate AI Ltd",
      userRole: "EXHIBITOR",
    },
    {
      id: "attendee-1",
      emailAddress: "attendee@example.com",
      password: "password",
      name: "Alex Attendee",
      contactNo: "+1234567893",
      nic: "991234570V",
      userRole: "ATTENDEE",
    },
  ],
  exhibitions: [
    {
      id: "ex-1",
      exhibitionName: "Salon de l'Innovation & de l'Art Numérique 2026",
      exhibitionOwnerId: "owner@example.com",
      description: "20 participants — démo de marche de l'avatar (WASD + souris, vue TPS/FPS).",
      category: "Technology",
      date: "2026-10-15",
      startTime: "09:00",
      endTime: "18:00",
      ticketPrice: 25,
      approved: true,
      started: true,
      noOfUsers: 142,
      visitedUsers: 580,
      bannerUrl: "/src/assets/img/home-banner-img.png",
      sponsorVideos: [],
    },
    {
      id: "ex-2",
      exhibitionName: "Virtual Art & Design Fair",
      exhibitionOwnerId: "owner@example.com",
      description: "Explore immersive digital galleries, 3D sculptures, and creator booths.",
      category: "Art & Design",
      date: "2026-11-01",
      startTime: "10:00",
      endTime: "20:00",
      ticketPrice: 15,
      approved: true,
      started: false,
      noOfUsers: 85,
      visitedUsers: 310,
      bannerUrl: "/src/assets/img/stalls/diamond1.png",
      sponsorVideos: [],
    },
    {
      id: "ex-3",
      exhibitionName: "Future Mobility Expo",
      exhibitionOwnerId: "owner@example.com",
      description: "Electric vehicles, autonomous transport systems, and sustainable city solutions.",
      category: "Automotive",
      date: "2026-12-05",
      startTime: "09:00",
      endTime: "17:00",
      ticketPrice: 30,
      approved: false,
      started: false,
      noOfUsers: 0,
      visitedUsers: 0,
      bannerUrl: "/src/assets/img/stalls/gold1.png",
      sponsorVideos: [],
    },
  ],
  stalls: [
    { id: "stall-01", stallId: "stall-01", exhibitionId: "ex-1", exhibitorEmail: "contact@novalabs.expo", stallName: "NovaLabs", stallType: "Diamond", tier: "Diamond", color: "#3b82f6", logoUrl: "", bannerUrl: "", documents: [], description: "Studio de réalité virtuelle et installations immersives.", status: "approved" },
    { id: "stall-02", stallId: "stall-02", exhibitionId: "ex-1", exhibitorEmail: "hello@chroma.expo", stallName: "Chroma", stallType: "Gold", tier: "Gold", color: "#8b5cf6", logoUrl: "", bannerUrl: "", documents: [], description: "Art génératif et projections mapping.", status: "approved" },
    { id: "stall-03", stallId: "stall-03", exhibitionId: "ex-1", exhibitorEmail: "team@quantumforge.expo", stallName: "Quantum Forge", stallType: "Platinum", tier: "Platinum", color: "#06b6d4", logoUrl: "", bannerUrl: "", documents: [], description: "Prototypage quantique et nouveaux matériaux.", status: "approved" },
    { id: "stall-04", stallId: "stall-04", exhibitionId: "ex-1", exhibitorEmail: "bonjour@lumina.expo", stallName: "Lumina", stallType: "Gold", tier: "Gold", color: "#f59e0b", logoUrl: "", bannerUrl: "", documents: [], description: "Lumières interactives et scénographie.", status: "approved" },
    { id: "stall-05", stallId: "stall-05", exhibitionId: "ex-1", exhibitorEmail: "hi@pixelco.expo", stallName: "Pixel & Co", stallType: "Diamond", tier: "Diamond", color: "#ec4899", logoUrl: "", bannerUrl: "", documents: [], description: "Galerie d'art pixel et collections numériques.", status: "approved" },
    { id: "stall-06", stallId: "stall-06", exhibitionId: "ex-1", exhibitorEmail: "contact@synthwave.expo", stallName: "SynthWave", stallType: "Gold", tier: "Gold", color: "#6366f1", logoUrl: "", bannerUrl: "", documents: [], description: "Musique générative et concerts virtuels.", status: "approved" },
    { id: "stall-07", stallId: "stall-07", exhibitionId: "ex-1", exhibitorEmail: "lab@biofab.expo", stallName: "BioFab", stallType: "Platinum", tier: "Platinum", color: "#22c55e", logoUrl: "", bannerUrl: "", documents: [], description: "Bio-impression et matériaux durables.", status: "approved" },
    { id: "stall-08", stallId: "stall-08", exhibitionId: "ex-1", exhibitorEmail: "neuro@neuroart.expo", stallName: "NeuroArt", stallType: "Gold", tier: "Gold", color: "#14b8a6", logoUrl: "", bannerUrl: "", documents: [], description: "Art contrôlé par le cerveau (EEG).", status: "approved" },
    { id: "stall-09", stallId: "stall-09", exhibitionId: "ex-1", exhibitorEmail: "studio@aurora.expo", stallName: "Aurora Studio", stallType: "Diamond", tier: "Diamond", color: "#0ea5e9", logoUrl: "", bannerUrl: "", documents: [], description: "Aurores boréales numériques en direct.", status: "approved" },
    { id: "stall-10", stallId: "stall-10", exhibitionId: "ex-1", exhibitorEmail: "hello@roboscope.expo", stallName: "RoboScope", stallType: "Gold", tier: "Gold", color: "#f43f5e", logoUrl: "", bannerUrl: "", documents: [], description: "Robots compagnons et démonstrations.", status: "approved" },
    { id: "stall-11", stallId: "stall-11", exhibitionId: "ex-1", exhibitorEmail: "contact@vertigo.expo", stallName: "Vertigo", stallType: "Platinum", tier: "Platinum", color: "#a855f7", logoUrl: "", bannerUrl: "", documents: [], description: "Expériences VR de voltige.", status: "approved" },
    { id: "stall-12", stallId: "stall-12", exhibitionId: "ex-1", exhibitorEmail: "bloom@databloom.expo", stallName: "DataBloom", stallType: "Gold", tier: "Gold", color: "#10b981", logoUrl: "", bannerUrl: "", documents: [], description: "Visualisation de données vivante.", status: "approved" },
    { id: "stall-13", stallId: "stall-13", exhibitionId: "ex-1", exhibitorEmail: "echo@echolab.expo", stallName: "EchoLab", stallType: "Diamond", tier: "Diamond", color: "#3b82f6", logoUrl: "", bannerUrl: "", documents: [], description: "Son spatialisé et acoustique expérimentale.", status: "approved" },
    { id: "stall-14", stallId: "stall-14", exhibitionId: "ex-1", exhibitorEmail: "hello@maskmaker.expo", stallName: "MaskMaker", stallType: "Gold", tier: "Gold", color: "#ef4444", logoUrl: "", bannerUrl: "", documents: [], description: "Masques en réalité augmentée et filtres.", status: "approved" },
    { id: "stall-15", stallId: "stall-15", exhibitionId: "ex-1", exhibitorEmail: "fusion@fusion.expo", stallName: "Fusion", stallType: "Platinum", tier: "Platinum", color: "#f97316", logoUrl: "", bannerUrl: "", documents: [], description: "Énergie propre et démonstrations.", status: "approved" },
    { id: "stall-16", stallId: "stall-16", exhibitionId: "ex-1", exhibitorEmail: "contact@kinetik.expo", stallName: "Kinetik", stallType: "Gold", tier: "Gold", color: "#84cc16", logoUrl: "", bannerUrl: "", documents: [], description: "Sculptures cinétiques et mobiles.", status: "approved" },
    { id: "stall-17", stallId: "stall-17", exhibitionId: "ex-1", exhibitorEmail: "holo@holo.expo", stallName: "Holo", stallType: "Diamond", tier: "Diamond", color: "#06b6d4", logoUrl: "", bannerUrl: "", documents: [], description: "Hologrammes et téléprésence.", status: "approved" },
    { id: "stall-18", stallId: "stall-18", exhibitionId: "ex-1", exhibitorEmail: "garden@garden3d.expo", stallName: "Garden3D", stallType: "Gold", tier: "Gold", color: "#22c55e", logoUrl: "", bannerUrl: "", documents: [], description: "Jardins procéduraux et écosystèmes.", status: "approved" },
    { id: "stall-19", stallId: "stall-19", exhibitionId: "ex-1", exhibitorEmail: "cipher@cipher.expo", stallName: "Cipher", stallType: "Platinum", tier: "Platinum", color: "#64748b", logoUrl: "", bannerUrl: "", documents: [], description: "Cybersécurité ludique et escape games.", status: "approved" },
    { id: "stall-20", stallId: "stall-20", exhibitionId: "ex-1", exhibitorEmail: "hi@stellar.expo", stallName: "Stellar", stallType: "Gold", tier: "Gold", color: "#0ea5e9", logoUrl: "", bannerUrl: "", documents: [], description: "Exploration spatiale et systèmes solaires.", status: "approved" },
  ],
  avatars: {
    "attendee@example.com": {
      gender: "male",
      avatarIndex: 1,
      clothingColor: "#2563eb",
      skinTone: "#fcd34d",
      hairColor: "#1f2937",
    },
  },
  tickets: [
    {
      id: "TCK-1001",
      ticketId: "TCK-1001",
      exhibitionId: "ex-1",
      exhibitionName: "Global Tech Summit 2026",
      userEmail: "attendee@example.com",
      ticketPrice: 25,
      purchaseDate: "2026-09-10",
    },
  ],
  payments: [
    {
      id: "PAY-501",
      exhibitionId: "ex-1",
      userId: "attendee@example.com",
      userType: "ATTENDEE",
      amount: 25,
      date: "2026-09-10",
      status: "Completed",
    },
  ],
  feedbacks: [
    {
      id: "FB-1",
      exhibitionId: "ex-1",
      userEmail: "attendee@example.com",
      rating: 5,
      feedback: "Incredible 3D stalls and smooth audio streaming!",
      createdAt: "2026-09-12",
    },
  ],
};

// ======================== API ROUTES ========================

// 1. AUTH ROUTES
app.post("/api/auth/login", (req, res) => {
  const { emailAddress, password } = req.body;
  const user = db.users.find(
    (u) => u.emailAddress?.toLowerCase() === emailAddress?.toLowerCase()
  );

  if (user) {
    res.json({
      userRole: user.userRole,
      token: `mock-jwt-token-for-${user.emailAddress}`,
      user: {
        name: user.name,
        emailAddress: user.emailAddress,
        userRole: user.userRole,
        contactNo: user.contactNo,
        nic: user.nic,
      },
    });
  } else {
    // Default fallback to allow test login
    res.json({
      userRole: "ATTENDEE",
      token: `mock-jwt-token-${Date.now()}`,
      user: {
        name: "Demo User",
        emailAddress: emailAddress || "demo@example.com",
        userRole: "ATTENDEE",
      },
    });
  }
});

app.post("/api/auth/adminRegistration", (req, res) => {
  const newUser = { ...req.body, id: `admin-${Date.now()}`, userRole: "ADMIN" };
  db.users.push(newUser);
  res.send("Admin registered successfully");
});

app.post("/api/auth/attendeeRegistration", (req, res) => {
  const newUser = { ...req.body, id: `attendee-${Date.now()}`, userRole: "ATTENDEE" };
  db.users.push(newUser);
  res.send("Attendee registered successfully");
});

app.post("/api/auth/exhibitionOwnerRegistration", (req, res) => {
  const newUser = { ...req.body, id: `owner-${Date.now()}`, userRole: "EX_OWNER" };
  db.users.push(newUser);
  res.send("Exhibition Owner registered successfully");
});

app.post("/api/auth/exhibitorRegistration", (req, res) => {
  const newUser = { ...req.body, id: `exhibitor-${Date.now()}`, userRole: "EXHIBITOR" };
  db.users.push(newUser);
  res.send("Exhibitor registered successfully");
});

app.get("/api/auth/getAdmin/:email", (req, res) => {
  const user = db.users.find((u) => u.emailAddress === req.params.email) || db.users[0];
  res.json(user);
});

app.get("/api/auth/getAttendee/:email", (req, res) => {
  const user = db.users.find((u) => u.emailAddress === req.params.email) || db.users[3];
  res.json(user);
});

app.get("/api/auth/getExhibitor/:email", (req, res) => {
  const user = db.users.find((u) => u.emailAddress === req.params.email) || db.users[2];
  res.json(user);
});

app.get("/api/auth/getExhibitionOwner/:email", (req, res) => {
  const user = db.users.find((u) => u.emailAddress === req.params.email) || db.users[1];
  res.json(user);
});

app.put("/api/auth/updateAdmin/:prevEmail", (req, res) => {
  const idx = db.users.findIndex((u) => u.emailAddress === req.params.prevEmail);
  if (idx !== -1) db.users[idx] = { ...db.users[idx], ...req.body };
  res.send("Admin updated successfully");
});

app.put("/api/auth/updateAttendee/:prevEmail", (req, res) => {
  const idx = db.users.findIndex((u) => u.emailAddress === req.params.prevEmail);
  if (idx !== -1) db.users[idx] = { ...db.users[idx], ...req.body };
  res.send("Attendee updated successfully");
});

app.put("/api/auth/updateExhibitor/:prevEmail", (req, res) => {
  const idx = db.users.findIndex((u) => u.emailAddress === req.params.prevEmail);
  if (idx !== -1) db.users[idx] = { ...db.users[idx], ...req.body };
  res.send("Exhibitor updated successfully");
});

app.put("/api/auth/updateExhibitionOwner/:prevEmail", (req, res) => {
  const idx = db.users.findIndex((u) => u.emailAddress === req.params.prevEmail);
  if (idx !== -1) db.users[idx] = { ...db.users[idx], ...req.body };
  res.send("Exhibition Owner updated successfully");
});

app.put("/api/auth/forgotPassword/:email", (req, res) => {
  res.send("Password reset link sent to your email.");
});

app.get("/api/auth/validate/:token", (req, res) => {
  res.send("VALID");
});

// 2. EXHIBITION ROUTES
app.get("/api/exhibitions", (req, res) => {
  res.json(db.exhibitions);
});

app.get("/api/exhibitions/:id", (req, res) => {
  const ex = db.exhibitions.find((e) => e.id === req.params.id);
  if (ex) res.json(ex);
  else res.status(404).json({ message: "Exhibition not found" });
});

app.get("/api/exhibitions/user/:ownerId", (req, res) => {
  const list = db.exhibitions.filter((e) => e.exhibitionOwnerId === req.params.ownerId);
  res.json(list);
});

app.get("/api/exhibitions/exhibition/:exhibitionId", (req, res) => {
  const ex = db.exhibitions.find((e) => e.id === req.params.exhibitionId);
  if (ex) res.json(ex);
  else res.status(404).json({ message: "Exhibition not found" });
});

app.post("/api/exhibitions", (req, res) => {
  const newEx = {
    id: `ex-${Date.now()}`,
    noOfUsers: 0,
    visitedUsers: 0,
    approved: true,
    started: false,
    sponsorVideos: [],
    ...req.body,
  };
  db.exhibitions.push(newEx);
  res.send("Exhibition added successfully");
});

app.put("/api/exhibitions/:id", (req, res) => {
  const idx = db.exhibitions.findIndex((e) => e.id === req.params.id);
  if (idx !== -1) {
    db.exhibitions[idx] = { ...db.exhibitions[idx], ...req.body };
  }
  res.send("Exhibition updated successfully");
});

app.delete("/api/exhibitions/:id", (req, res) => {
  db.exhibitions = db.exhibitions.filter((e) => e.id !== req.params.id);
  res.send("Exhibition deleted successfully");
});

app.put("/api/exhibitions/approve/:id", (req, res) => {
  const ex = db.exhibitions.find((e) => e.id === req.params.id);
  if (ex) ex.approved = true;
  res.send("Exhibition approved");
});

app.put("/api/exhibitions/:id/start", (req, res) => {
  const ex = db.exhibitions.find((e) => e.id === req.params.id);
  if (ex) ex.started = req.query.start === "true";
  res.send("Exhibition start status updated");
});

app.get("/api/exhibitions/getByExhibitionOwner/:id", (req, res) => {
  res.json([
    {
      id: "exhibitor-1",
      name: "Sarah Exhibitor",
      email: "exhibitor@example.com",
      companyName: "Innovate AI Ltd",
      stallType: "Diamond",
      status: "Approved",
    },
  ]);
});

app.put("/api/exhibitions/activeUsers/:id", (req, res) => {
  const ex = db.exhibitions.find((e) => e.id === req.params.id);
  if (ex && req.query.number) ex.noOfUsers = parseInt(req.query.number as string, 10);
  res.send("Active users updated");
});

app.put("/api/exhibitions/visitedUsers/:id", (req, res) => {
  const ex = db.exhibitions.find((e) => e.id === req.params.id);
  if (ex) ex.visitedUsers = (ex.visitedUsers || 0) + 1;
  res.send("Visited users incremented");
});

app.get("/api/exhibitions/visitedUsers/:id", (req, res) => {
  const ex = db.exhibitions.find((e) => e.id === req.params.id);
  res.json(ex ? ex.visitedUsers || 0 : 0);
});

// 3. STALLS ROUTES
app.get("/api/stalls", (req, res) => {
  res.json(db.stalls);
});

app.get("/api/stalls/:email", (req, res) => {
  const stalls = db.stalls.filter((s) => s.exhibitorEmail === req.params.email);
  res.json(stalls.length > 0 ? stalls : [db.stalls[0]]);
});

app.get("/api/stalls/:exhibitionId/:stallId", (req, res) => {
  const stall = db.stalls.find(
    (s) => s.exhibitionId === req.params.exhibitionId && s.stallId === req.params.stallId
  );
  res.json(stall || db.stalls[0]);
});

app.post("/api/stalls", (req, res) => {
  const newStall = {
    id: `stall-${Date.now()}`,
    stallId: req.body.stallId || `stall-${Date.now()}`,
    ...req.body,
  };
  db.stalls.push(newStall);
  res.send("Stall configured successfully");
});

// 4. AVATAR ROUTES
app.get("/api/avatar/:email", (req, res) => {
  const avatar = db.avatars[req.params.email] || db.avatars["attendee@example.com"];
  res.json(avatar);
});

app.post("/api/avatar", (req, res) => {
  const { email, ...config } = req.body;
  db.avatars[email || "attendee@example.com"] = config;
  res.send("Avatar customization saved");
});

// 4b. AVATAR ROUTES (plural, legacy frontend shape)
app.get("/api/avatars/:userId", (req, res) => {
  const avatar = db.avatars[req.params.userId];
  res.json(avatar ? { avatarId: avatar.avatarId ?? null, ...avatar } : { avatarId: null });
});

app.post("/api/avatars/", (req, res) => {
  const { userId, avatarId } = req.body;
  db.avatars[userId || "attendee@example.com"] = { avatarId: String(avatarId), ...req.body };
  res.send("Avatar saved successfully");
});

app.put("/api/avatars/", (req, res) => {
  const { userId, avatarId } = req.body;
  const key = userId || "attendee@example.com";
  db.avatars[key] = { ...(db.avatars[key] || {}), avatarId: String(avatarId), ...req.body };
  res.send("Avatar updated successfully");
});

// 5. TICKETS ROUTES
app.get("/api/tickets/getTicketInfo/:email", (req, res) => {
  const userTickets = db.tickets.filter((t) => t.userEmail === req.params.email);
  res.json(userTickets.length > 0 ? userTickets : db.tickets);
});

app.post("/api/tickets", (req, res) => {
  const newTicket = {
    id: `TCK-${Date.now()}`,
    ticketId: `TCK-${Date.now()}`,
    purchaseDate: new Date().toISOString().split("T")[0],
    ...req.body,
  };
  db.tickets.push(newTicket);
  res.send("Ticket purchased successfully");
});

// 6. PAYMENTS & GATEWAY ROUTES
app.get("/api/payments", (req, res) => {
  res.json(db.payments);
});

app.post("/api/payments", (req, res) => {
  const newPayment = {
    id: `PAY-${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    status: "Completed",
    ...req.body,
  };
  db.payments.push(newPayment);

  // Auto-generate ticket if this was an attendee ticket purchase
  if (req.body.exhibitionId) {
    const ex = db.exhibitions.find((e) => e.id === req.body.exhibitionId);
    db.tickets.push({
      id: `TCK-${Date.now()}`,
      ticketId: `TCK-${Date.now()}`,
      exhibitionId: req.body.exhibitionId,
      exhibitionName: ex?.exhibitionName || "Virtual Exhibition",
      userEmail: req.body.userId || "attendee@example.com",
      ticketPrice: req.body.amount || 25,
      purchaseDate: new Date().toISOString().split("T")[0],
    });
  }

  res.send("Payment registered successfully");
});

app.post("/api/payment-gateway/charge", (req, res) => {
  res.json({
    status: "success",
    message: "Payment charged successfully via mock gateway",
  });
});

// 7. FEEDBACK ROUTES
app.get("/api/feedback", (req, res) => {
  res.json(db.feedbacks);
});

app.post("/api/feedback", (req, res) => {
  const newFb = {
    id: `FB-${Date.now()}`,
    createdAt: new Date().toISOString().split("T")[0],
    ...req.body,
  };
  db.feedbacks.push(newFb);
  res.send("Feedback submitted successfully");
});

// 8. STATS ROUTE
app.get("/api/stats", (req, res) => {
  res.json({
    totalExhibitions: db.exhibitions.length,
    activeExhibitions: db.exhibitions.filter((e) => e.started).length,
    totalUsers: db.users.length,
    totalTicketsSold: db.tickets.length,
    totalRevenue: db.payments.reduce((acc, p) => acc + (p.amount || 0), 0),
  });
});

// 9. AGORA LIVE STREAMING ROUTES
app.put("/api/agora/token", (req, res) => {
  res.json({
    status: "success",
    token: `mock-agora-rtc-token-${Date.now()}`,
    channelName: `channel-${req.body.exhibitionId || "demo"}-${req.body.stallId || "stall"}`,
  });
});

app.get("/api/agora/:exhibitionId/:stallId", (req, res) => {
  res.json({
    token: `mock-agora-rtc-token-${req.params.exhibitionId}`,
    channelName: `channel-${req.params.exhibitionId}-${req.params.stallId}`,
  });
});

// Jeton RTC pour la voix de proximite (meme canal que le chat de proximite).
// NOTE : jeton "maquette", coherent avec les autres routes Agora du depot.
// Une voix Agora REELLE exigerait de signer le jeton cote serveur avec le
// certificat de l'App (variable d'environnement, JAMAIS envoyee au client).
app.post("/api/agora/rtctoken", (req, res) => {
  const channel = String(req.body.channel || "prox-voice-demo").slice(0, 64);
  res.json({
    status: "success",
    token: `mock-agora-rtc-token-${channel}-${Date.now()}`,
    channelName: channel,
    appId: "2ce678e703a841f185e2e312a9bdf2e0",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 10. HABILLAGE DE STAND (menu admin / construction de stand)
// Modele de stand + visuel 2D (image ou video) + kakemono (banniere verticale)
// + zone audio 3D. Stockage en MEMOIRE (demo) : les visuels sont des data URLs
// base64 (comme la photo de profil). Aucune persistance disque.
const MAX_DECOR_ASSET = 4_000_000; // ~3 Mo d'image/video en base64
const MAX_ASSETS = 6;              // assets 3D/interactifs par stand
const MAX_ASSET_URL = 300;         // longueur d'une URL (hors data URL)
const stallDecor = new Map<string, any>();

// AUTH ADMIN : les ecritures de conception (stall-decor, hall-config, worlds)
// exigent un token (header Authorization). DOIT etre enregistre AVANT les
// routes concernees (Express applique les middlewares dans l'ordre).
function requireAdminWrite(req: any, res: any, next: any) {
  const auth = String(req.headers.authorization || "");
  if (!auth || auth.length < 8) return res.status(401).json({ status: "error", message: "Token requis" });
  next();
}
const adminWritePaths = ["/api/hall-config", "/api/worlds", "/api/stall-decor"];
app.use((req: any, res: any, next: any) => {
  if (req.method === "PUT" && adminWritePaths.some((p) => req.path === p || req.path.startsWith(p + "/"))) {
    return requireAdminWrite(req, res, next);
  }
  next();
});

// Assets 3D / interactifs importes sur un stand :
//  - kind "model"       : un modele glTF/GLB (URL http(s) ou data URL) place dans le hall ;
//  - kind "interactive" : une page web interactive affichee dans une visionneuse.
// `interactUrl` (sur un modele) rend le modele cliquable et ouvre la page associee.
function sanitizeAssets(raw: any) {
  if (!Array.isArray(raw)) return [];
  const out: any[] = [];
  raw.slice(0, MAX_ASSETS).forEach((a: any, i: number) => {
    if (!a || typeof a !== "object") return;
    const url = typeof a.url === "string" ? a.url.trim() : "";
    if (!url) return;
    // Une data URL (fichier televerse) est bornee ; une URL distante est courte.
    const isData = url.startsWith("data:");
    if (isData) {
      if (url.length > MAX_DECOR_ASSET) return;
    } else if (url.length > MAX_ASSET_URL) {
      return;
    }
    const item: any = {
      id: typeof a.id === "string" && a.id ? a.id.slice(0, 40) : `asset-${i + 1}`,
      kind: a.kind === "interactive" ? "interactive" : "model",
      name: typeof a.name === "string" ? a.name.slice(0, 60) : "",
      url,
      dx: clampNum(a.dx, -14, 14),
      dz: clampNum(a.dz, -14, 14),
      scale: clampNum(a.scale, 0.1, 5),
      rotY: clampNum(a.rotY, -180, 180),
    };
    const iu = typeof a.interactUrl === "string" ? a.interactUrl.trim() : "";
    if (iu && iu.length <= MAX_ASSET_URL) item.interactUrl = iu;
    out.push(item);
  });
  return out;
}

function sanitizeDecor(body: any) {
  const out: any = {};
  if (typeof body.model === "string") out.model = body.model.slice(0, 20);
  const d = body.display;
  if (d && typeof d.dataUrl === "string" && d.dataUrl.length <= MAX_DECOR_ASSET) {
    out.display = {
      kind: d.kind === "video" ? "video" : "image",
      dataUrl: d.dataUrl,
      title: typeof d.title === "string" ? d.title.slice(0, 80) : "",
    };
  }
  const k = body.kakemono;
  if (k && typeof k.dataUrl === "string" && k.dataUrl.length <= MAX_DECOR_ASSET) {
    out.kakemono = { dataUrl: k.dataUrl };
  }
  const z = body.audioZone;
  if (z && typeof z === "object") {
    out.audioZone = {
      dx: clampNum(z.dx, -20, 20),
      dz: clampNum(z.dz, -20, 20),
      r: clampNum(z.r, 1, 25),
    };
  }
  // Sanitizer des ecrans supplementaires (playlist multi-ecrans).
  function sanitizeScreens(raw) {
    if (!Array.isArray(raw)) return undefined;
    const out = raw.slice(0, 6).map((s, i) => {
      if (!s || typeof s !== "object") return null;
      const url = typeof s.url === "string" ? s.url.trim() : "";
      if (!url || (url.startsWith("data:") ? url.length > MAX_DECOR_ASSET : url.length > MAX_ASSET_URL)) return null;
      return {
        id: typeof s.id === "string" && s.id ? s.id.slice(0, 40) : `screen-${i + 1}`,
        kind: s.kind === "video" ? "video" : "image",
        url,
        dx: clampNum(s.dx, -14, 14),
        dy: clampNum(s.dy, 0.5, 8),
        dz: clampNum(s.dz, -14, 14),
        width: clampNum(s.width, 0.3, 6),
        height: clampNum(s.height, 0.3, 4),
      };
    }).filter(Boolean);
    return out;
  }

  // Sanitizer de la sortie audio 3D positionnelle du stand.
  function sanitizeAudio3d(raw) {
    if (!raw || typeof raw !== "object") return undefined;
    const url = typeof raw.url === "string" ? raw.url.trim() : "";
    if (!url || (url.startsWith("data:") ? url.length > MAX_DECOR_ASSET : url.length > MAX_ASSET_URL)) return undefined;
    return {
      enabled: !!raw.enabled,
      url,
      dx: clampNum(raw.dx, -14, 14),
      dz: clampNum(raw.dz, -14, 14),
      distance: clampNum(raw.distance, 2, 60),
      rolloff: clampNum(raw.rolloff, 0.2, 4),
      volume: clampNum(raw.volume, 0, 1),
      loop: raw.loop !== false,
    };
  }

  // Sanitizer des ecrans supplementaires + audio 3D (fusionnes dans sanitizeDecor).
  // Un tableau vide est CONSERVE : sinon retirer ecrans/assets ne serait pas
  // enregistre (le PUT precedent resterait en place).
  if (body.screens !== undefined) {
    const sc = sanitizeScreens(body.screens);
    if (sc !== undefined) out.screens = sc;
  }
  if (body.audio3d !== undefined) {
    const a3 = sanitizeAudio3d(body.audio3d);
    if (a3 !== undefined) out.audio3d = a3;
  }
  if (Array.isArray(body.assets)) out.assets = sanitizeAssets(body.assets);
  return out;
}

app.get("/api/stall-decor", (req, res) => {
  const out: any = {};
  for (const [key, val] of stallDecor.entries()) out[key] = val;
  res.json(out);
});

app.get("/api/stall-decor/:stallId", (req, res) => {
  res.json(stallDecor.get(req.params.stallId) || {});
});

app.put("/api/stall-decor/:stallId", (req, res) => {
  const decor = sanitizeDecor(req.body || {});
  stallDecor.set(req.params.stallId, decor);
  res.json({ status: "success", stallId: req.params.stallId, decor });
});

// ===========================================================================
// 10b. CONFIGURATION DU HALL (Hall Builder admin)
// Source de verite pour la geometrie de l'exposition : sol/murs/plafond,
// grille (x,y,z), objets 3D libres, zones audio cubiques, avatars importes.
// Meme pattern de persistance en memoire que stallDecor.
// ===========================================================================
const hallConfigStore: { current: any } = { current: null };

function sanitizeHallConfig(body: any) {
  const out: any = {};
  const f = body.floor;
  if (f && typeof f === "object") {
    out.floor = {
      sizeX: clampNum(f.sizeX, 10, 500),
      sizeZ: clampNum(f.sizeZ, 10, 500),
      color: typeof f.color === "string" ? f.color.slice(0, 20) : "#1a2340",
      model: typeof f.model === "string" ? f.model.slice(0, 40) : "flat",
    };
  }
  const w = body.walls;
  if (w && typeof w === "object") {
    out.walls = {
      height: clampNum(w.height, 2, 60),
      color: typeof w.color === "string" ? w.color.slice(0, 20) : "#11182f",
      model: typeof w.model === "string" ? w.model.slice(0, 40) : "box",
      thickness: clampNum(w.thickness, 0.1, 5),
      invisibleForTPS: !!w.invisibleForTPS,
    };
  }
  const c = body.ceiling;
  if (c && typeof c === "object") {
    out.ceiling = {
      enabled: !!c.enabled,
      height: clampNum(c.height, 3, 100),
      color: typeof c.color === "string" ? c.color.slice(0, 20) : "#0b1020",
      model: typeof c.model === "string" ? c.model.slice(0, 40) : "flat",
    };
  }
  const a = body.aisle;
  if (a && typeof a === "object") {
    out.aisle = {
      width: clampNum(a.width, 0, 100),
      length: clampNum(a.length, 0, 200),
      color: typeof a.color === "string" ? a.color.slice(0, 20) : "#7a1f2b",
    };
  }
  const g = body.grid;
  if (g && typeof g === "object") {
    out.grid = { step: clampNum(g.step, 0.5, 20), show: !!g.show };
  }
  // Objets 3D libres (statiques ou interactifs) poses sur la grille.
  if (Array.isArray(body.objects)) {
    out.objects = body.objects.slice(0, 200).map((o: any, i: number) => {
      if (!o || typeof o !== "object") return null;
      const url = typeof o.url === "string" ? o.url.trim() : "";
      if (!url || url.length > MAX_DECOR_ASSET) return null;
      return {
        id: typeof o.id === "string" && o.id ? o.id.slice(0, 40) : `obj-${i + 1}`,
        name: typeof o.name === "string" ? o.name.slice(0, 60) : "",
        url,
        kind: o.kind === "interactive" ? "interactive" : "model",
        x: clampNum(o.x, -250, 250),
        y: clampNum(o.y, -10, 100),
        z: clampNum(o.z, -250, 250),
        scale: clampNum(o.scale, 0.1, 20),
        rotY: clampNum(o.rotY, -180, 180),
        interactUrl: typeof o.interactUrl === "string" ? o.interactUrl.slice(0, MAX_ASSET_URL) : "",
      };
    }).filter(Boolean);
  }
  // Zones audio 3D CUBIQUES redimensionnables (sections de la map).
  if (Array.isArray(body.globalAudioZones)) {
    out.globalAudioZones = body.globalAudioZones.slice(0, 50).map((z: any, i: number) => {
      if (!z || typeof z !== "object") return null;
      return {
        id: typeof z.id === "string" && z.id ? z.id.slice(0, 40) : `zone-${i + 1}`,
        name: typeof z.name === "string" ? z.name.slice(0, 60) : "",
        x: clampNum(z.x, -250, 250),
        y: clampNum(z.y, -10, 100),
        z: clampNum(z.z, -250, 250),
        sizeX: clampNum(z.sizeX, 0.5, 500),
        sizeY: clampNum(z.sizeY, 0.5, 100),
        sizeZ: clampNum(z.sizeZ, 0.5, 500),
        // Source audio de la zone : "" = ambiance, sinon liee a un visuel 2D de stand.
        sourceStallId: typeof z.sourceStallId === "string" ? z.sourceStallId.slice(0, 60) : "",
      };
    }).filter(Boolean);
  }
  // Zones audio par rangee de stands.
  if (body.rowAudioZones && typeof body.rowAudioZones === "object") {
    const ro: any = {};
    for (const k of Object.keys(body.rowAudioZones).slice(0, 50)) {
      const z = body.rowAudioZones[k];
      if (!z || typeof z !== "object") continue;
      ro[k] = {
        x: clampNum(z.x, -250, 250),
        y: clampNum(z.y, -10, 100),
        z: clampNum(z.z, -250, 250),
        sizeX: clampNum(z.sizeX, 0.5, 500),
        sizeY: clampNum(z.sizeY, 0.5, 100),
        sizeZ: clampNum(z.sizeZ, 0.5, 500),
      };
    }
    out.rowAudioZones = ro;
  }
  // Banque d'avatars importes (GLB/GLTF).
  if (Array.isArray(body.avatars)) {
    out.avatars = body.avatars.slice(0, 100).map((a: any, i: number) => {
      if (!a || typeof a !== "object") return null;
      const url = typeof a.url === "string" ? a.url.trim() : "";
      if (!url || url.length > MAX_DECOR_ASSET) return null;
      return {
        id: typeof a.id === "string" && a.id ? a.id.slice(0, 40) : `av-${i + 1}`,
        name: typeof a.name === "string" ? a.name.slice(0, 60) : "",
        url,
      };
    }).filter(Boolean);
  }
  return out;
}

app.get("/api/hall-config", (req, res) => {
  res.json(hallConfigStore.current || {});
});

app.put("/api/hall-config", (req, res) => {
  const config = sanitizeHallConfig(req.body || {});
  hallConfigStore.current = config;
  res.json({ status: "success", config });
});

// 11. BOTS 3D CONNECTES A DES API EXTERNES
// Un bot = un personnage dans le hall auquel on parle (texte OU voix) et qui
// repond (texte + voix + UI generative). Si BOT_API_URL est configure, le
// serveur PROXYFIE vers l'API externe ; sinon il repond LOCALEMENT (assistant
// du salon : liste des stands, recherche, frequentation, teleportation).
interface BotDef { id: string; name: string; role: string; x: number; z: number; }
const bots: BotDef[] = [
  { id: "aria", name: "Aria", role: "Assistante du salon", x: 7.5, z: 6 },
];

// Point d'approche libre d'un stand (meme regle que le client : couloir entre 2 colonnes).
function botStallApproach(i: number, n: number) {
  const COLS = 5, SPX = 15, SPZ = 9;
  const rows = Math.ceil(n / COLS);
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const sx = (col - (COLS - 1) / 2) * SPX;
  const sz = (row - (rows - 1) / 2) * SPZ;
  const lane = sx <= 0 ? sx + SPX / 2 : sx - SPX / 2;
  return [lane, sz];
}

// Reponse locale (demo, sans cle d'API) : assistant utile du salon.
function localBotReply(text: string, files: string[]) {
  const t = String(text || "").toLowerCase();
  const stalls: any[] = (db as any).stalls || [];
  const n = stalls.length;

  if (/aide|help|que (sais|peux)|capacit|comment (ca|ça) marche/.test(t)) {
    return {
      reply: "Je peux vous guider dans le salon : lister les exposants, trouver un stand, ou donner la fréquentation en direct.",
      ui: {
        type: "card",
        title: "Ce que je peux faire",
        items: [
          { label: "Lister les stands", sub: "avec un bouton pour y aller" },
          { label: "Trouver un stand", sub: "ex. « où est NovaLabs ? »" },
          { label: "Fréquentation", sub: "combien de visiteurs connectés" },
        ],
      },
    };
  }

  if (/visiteur|combien|fr[eé]quent|en ligne|pr[eé]sent|qui est l/.test(t)) {
    const c = peers.size;
    return {
      reply: `Il y a actuellement ${c} personne(s) connectée(s) dans le salon.`,
      ui: { type: "card", title: "Fréquentation en direct", text: `${c} visiteur(s) connecté(s).` },
    };
  }

  const byName = stalls.find((s) =>
    String(s.stallName || "").toLowerCase().split(/\s+/).some((w) => w.length > 3 && t.includes(w))
  );
  if (byName) {
    const i = stalls.indexOf(byName);
    const [x, z] = botStallApproach(i, n);
    return {
      reply: `Le stand « ${byName.stallName} » (${byName.stallType || byName.tier || "Standard"}) — ${byName.description || ""}`,
      ui: {
        type: "card",
        title: byName.stallName || byName.stallId,
        text: byName.description || "",
        actions: [{ label: "Y aller", action: { type: "teleport", x, z } }],
      },
    };
  }

  if (/stand|exposant|liste|qui expose|participant|hall/.test(t)) {
    const items = stalls.slice(0, 8).map((s, i) => {
      const [x, z] = botStallApproach(i, n);
      return {
        label: s.stallName || s.stallId,
        sub: s.stallType || s.tier || "",
        action: { type: "teleport", x, z },
      };
    });
    return {
      reply: `Voici ${stalls.length} exposants. Cliquez « Y aller » pour vous y téléporter.`,
      ui: { type: "card", title: "Exposants", items },
    };
  }

  if (files.length) {
    return {
      reply: `J'ai bien reçu ${files.length} fichier(s) : ${files.join(", ")}. Un bot branché sur une API externe pourrait les analyser.`,
    };
  }

  return {
    reply: "Je suis Aria, l'assistante du salon. Dites-moi par exemple « liste des stands », « où est NovaLabs ? » ou « combien de visiteurs ? ».",
  };
}

app.get("/api/bots", (req, res) => {
  res.json(bots);
});

app.post("/api/bots/:botId/chat", async (req, res) => {
  const bot = bots.find((b) => b.id === req.params.botId);
  if (!bot) {
    res.status(404).json({ error: "bot inconnu" });
    return;
  }
  const text = String((req.body && req.body.text) || "").slice(0, 2000);
  const files: string[] = Array.isArray(req.body && req.body.files)
    ? req.body.files.slice(0, 5).map((f: any) => String((f && f.name) || "").slice(0, 120))
    : [];
  const history = Array.isArray(req.body && req.body.history) ? req.body.history.slice(-10) : [];

  // 1) API externe si configuree (BOT_API_URL + BOT_API_KEY).
  const apiUrl = process.env.BOT_API_URL;
  if (apiUrl) {
    try {
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.BOT_API_KEY ? { Authorization: `Bearer ${process.env.BOT_API_KEY}` } : {}),
        },
        body: JSON.stringify({ bot: { id: bot.id, name: bot.name, role: bot.role }, text, files, history }),
      });
      const data: any = await r.json();
      res.json({
        reply: String((data && (data.reply || data.text)) || "").slice(0, 4000),
        ui: (data && data.ui) || null,
        source: "external",
      });
      return;
    } catch (e) {
      // Repli local ci-dessous.
    }
  }

  // 2) Repli local (demo).
  const out = localBotReply(text, files);
  res.json({ ...out, source: "local" });
});


// ======================== TEMPS REEL (WebSocket) ========================
// Multijoueur + chat de proximite. Le serveur relaie la presence des avatars
// (position/cap/couleur/nom/statut) et diffuse les messages texte UNIQUEMENT
// aux avatars situes dans un rayon de proximite (PROXIMITY). Aucune persistence :
// tout est en memoire, parfaire pour une demo (un redemarrage efface les pairs).

const PROXIMITY = 12; // rayon de proximite (unites monde) pour le chat
const BOUND_X = 38;
const BOUND_Z = 18;

interface PeerInfo {
  id: string;
  name: string;
  color: string;
  photo: string;
  availability: string;
  agoraUid?: string | null; // UID Agora (numérique) du pair, annoncé quand il active le micro
  x: number;
  z: number;
  heading: number;
}

// id -> { ws, info }
const peers = new Map<string, { ws: any; info: PeerInfo }>();

const clampNum = (v: any, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const VALID_AVAIL = ["online", "busy", "away", "offline"];
const cleanAvail = (a: any) => (VALID_AVAIL.includes(a) ? a : "online");

const newId = () =>
  "p" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

function peerSnapshot(): PeerInfo[] {
  return Array.from(peers.values()).map((p) => p.info);
}

function broadcastPeers() {
  const payload = JSON.stringify({ type: "peers", peers: peerSnapshot() });
  for (const p of peers.values()) {
    if (p.ws.readyState === 1) p.ws.send(payload);
  }
}

function broadcastMove(id: string, x: number, z: number, heading: number) {
  const payload = JSON.stringify({ type: "peer-move", id, x, z, heading });
  for (const p of peers.values()) {
    if (p.ws.readyState === 1) p.ws.send(payload);
  }
}

// ======================== CONVERSATIONS VERROUILLEES ========================
// Sessions privees / groupe : seuls les MEMBRES recoivent les messages texte
// et les fichiers. Le serveur relaie uniquement aux membres (gate), sans
// persistance (tout en memoire, comme le reste). Chaque session a son propre
// canal Agora (channel = "lock-<id>") pour que la VOIX y soit privee au groupe.
interface LockSession {
  id: string;
  name: string;
  ownerId: string;
  channel: string;
  members: Set<string>; // peerIds
}
const sessions = new Map<string, LockSession>();
// ~2,2 Mo decodes ; on borne la taille base64 pour eviter les payloads geants.
const LOCK_MAX_FILE_B64 = 3 * 1024 * 1024;

function sessionView(s: LockSession) {
  return {
    id: s.id,
    name: s.name,
    ownerId: s.ownerId,
    channel: s.channel,
    members: Array.from(s.members),
  };
}

function broadcastToSession(s: LockSession, payload: string) {
  for (const pid of s.members) {
    const p = peers.get(pid);
    if (p && p.ws.readyState === 1) p.ws.send(payload);
  }
}

// Retire un pair de toutes ses sessions ; disband si vide ou si le createur part.
function leaveAllSessions(pid: string) {
  for (const s of sessions.values()) {
    if (!s.members.has(pid)) continue;
    s.members.delete(pid);
    if (s.members.size === 0 || s.ownerId === pid) {
      sessions.delete(s.id);
      const closed = JSON.stringify({ type: "lock-closed", sessionId: s.id });
      for (const m of Array.from(s.members)) {
        const p = peers.get(m);
        if (p && p.ws.readyState === 1) p.ws.send(closed);
      }
    } else {
      broadcastToSession(s, JSON.stringify({ type: "lock-updated", session: sessionView(s) }));
    }
  }
}

// Diffuse un message de chat aux avatars dans le rayon de proximite de
// l'emetteur (l'emetteur lui-meme est toujours inclus : distance = 0).
function broadcastProximityChat(fromId: string, name: string, color: string, text: string) {
  const from = peers.get(fromId);
  if (!from) return;
  const payload = JSON.stringify({
    type: "chat",
    from: fromId,
    name,
    color,
    text,
    ts: Date.now(),
  });
  for (const p of peers.values()) {
    if (p.ws.readyState !== 1) continue;
    const d = Math.hypot(p.info.x - from.info.x, p.info.z - from.info.z);
    if (d <= PROXIMITY) p.ws.send(payload);
  }
}

function setupRealtime(server: http.Server) {
  // noServer : on refuse les upgrades qui ne concernent pas /ws, afin de
  // laisser Vite gerer son propre HMR (WebSocket) sur le meme serveur.
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    let pathname = "/";
    try {
      pathname = new URL(req.url || "", "http://localhost").pathname;
    } catch {
      pathname = "/";
    }
    if (pathname !== "/ws") return; // laisse Vite traiter son HMR
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws: any) => {
    const id = newId();
    const entry = {
      ws,
      info: {
        id,
        name: "Invité",
        color: "#2563eb",
        photo: "",
        availability: "online",
        agoraUid: null, // UID Agora (numerique) annonce quand le pair active son micro
        x: 0,
        z: 0,
        heading: 0,
      } as PeerInfo,
    };
    peers.set(id, entry);
    // Accueil : on donne son propre id + la liste courante des pairs.
    ws.send(JSON.stringify({ type: "welcome", id, peers: peerSnapshot() }));

    ws.on("message", (raw: any) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== "string") return;

      if (msg.type === "join") {
        entry.info.name = String(msg.name || "Invité").slice(0, 40);
        entry.info.color = String(msg.color || "#2563eb").slice(0, 20);
        entry.info.photo = String(msg.photo || "").slice(0, 400);
        entry.info.availability = cleanAvail(msg.availability);
        if (msg.agoraUid != null) entry.info.agoraUid = String(msg.agoraUid).slice(0, 20);
        broadcastPeers();
      } else if (msg.type === "move") {
        entry.info.x = clampNum(msg.x, -BOUND_X, BOUND_X);
        entry.info.z = clampNum(msg.z, -BOUND_Z, BOUND_Z);
        entry.info.heading = clampNum(msg.heading, -Math.PI * 4, Math.PI * 4);
        broadcastMove(id, entry.info.x, entry.info.z, entry.info.heading);
      } else if (msg.type === "presence") {
        if (typeof msg.name === "string") entry.info.name = msg.name.slice(0, 40);
        if (typeof msg.color === "string") entry.info.color = msg.color.slice(0, 20);
        if (typeof msg.photo === "string") entry.info.photo = msg.photo.slice(0, MAX_PHOTO);
        if (typeof msg.availability === "string")
          entry.info.availability = cleanAvail(msg.availability);
        if (msg.agoraUid != null) entry.info.agoraUid = String(msg.agoraUid).slice(0, 20);
        broadcastPeers();
      } else if (msg.type === "chat") {
        const text = String(msg.text || "").slice(0, 500).trim();
        if (text) {
          broadcastProximityChat(id, entry.info.name, entry.info.color, text);
          // Historique persiste (24 h) pour le rechargement de page.
          try {
            extDeps.pushChat({ from: id, name: entry.info.name, color: entry.info.color, text, x: entry.info.x, z: entry.info.z });
          } catch (e) { /* extensions non chargees */ }
        }
      } else if (msg.type === "lock-create") {
        // Cree une session privee/groupe et ajoute le createur + les invites
        // (uniquement les pairs reellement connectes).
        const name = String(msg.name || "Conversation verrouillée").slice(0, 60);
        const inviteIds = Array.isArray(msg.inviteIds)
          ? msg.inviteIds.filter((x: any) => typeof x === "string").slice(0, 20)
          : [];
        const members = new Set<string>([id]);
        for (const pid of inviteIds) if (peers.has(pid) && pid !== id) members.add(pid);
        const sid = newId();
        const s: LockSession = {
          id: sid,
          name,
          ownerId: id,
          channel: "lock-" + sid,
          members,
        };
        sessions.set(sid, s);
        ws.send(JSON.stringify({ type: "lock-created", session: sessionView(s) }));
        const payload = JSON.stringify({ type: "lock-synced", session: sessionView(s) });
        for (const pid of members) {
          if (pid === id) continue;
          const p = peers.get(pid);
          if (p && p.ws.readyState === 1) p.ws.send(payload);
        }
      } else if (msg.type === "lock-msg") {
        const s = sessions.get(String(msg.sessionId));
        if (s && s.members.has(id)) {
          const text = String(msg.text || "").slice(0, 500).trim();
          if (text) {
            const payload = JSON.stringify({
              type: "lock-msg",
              sessionId: s.id,
              from: id,
              name: entry.info.name,
              color: entry.info.color,
              text,
              ts: Date.now(),
            });
            broadcastToSession(s, payload);
          }
        }
      } else if (msg.type === "lock-file") {
        const s = sessions.get(String(msg.sessionId));
        if (s && s.members.has(id)) {
          const data = String(msg.data || "");
          if (data.length <= LOCK_MAX_FILE_B64) {
            const payload = JSON.stringify({
              type: "lock-file",
              sessionId: s.id,
              from: id,
              name: entry.info.name,
              fileName: String(msg.fileName || "fichier").slice(0, 120),
              mime: String(msg.mime || "application/octet-stream").slice(0, 80),
              size: Number(msg.size) || data.length,
              data,
              ts: Date.now(),
            });
            broadcastToSession(s, payload);
          }
        }
      } else if (msg.type === "lock-leave") {
        const s = sessions.get(String(msg.sessionId));
        if (s && s.members.has(id)) {
          s.members.delete(id);
          if (s.members.size === 0 || s.ownerId === id) {
            sessions.delete(s.id);
            const closed = JSON.stringify({ type: "lock-closed", sessionId: s.id });
            for (const m of Array.from(s.members)) {
              const p = peers.get(m);
              if (p && p.ws.readyState === 1) p.ws.send(closed);
            }
          } else {
            broadcastToSession(s, JSON.stringify({ type: "lock-updated", session: sessionView(s) }));
          }
        }
      }
    });

    ws.on("close", () => {
      leaveAllSessions(id);
      peers.delete(id);
      broadcastPeers();
    });
    ws.on("error", () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    });
  });
}

import { registerExtensions } from "./server-extensions";

const extDeps: any = {};
registerExtensions(app, {
  stallDecor,
  getHallConfig: () => hallConfigStore.current,
  setHallConfig: (c: any) => { hallConfigStore.current = c; },
  getPeers: () => peers,
  mockUsers: db.users,
  extDeps,
});

// ======================== SERVER & VITE INTEGRATION ========================
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      // On passe `server` a Vite pour que son HMR (WebSocket) s'attache a NOTRE
      // serveur http : ainsi /ws (notre canal temps reel) et le HMR Vite
      // coexistent sur le meme port.
      server: { middlewareMode: true, hmr: { server } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  setupRealtime(server);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
