import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";

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
      exhibitionName: "Global Tech Summit 2026",
      exhibitionOwnerId: "owner@example.com",
      description: "Annual showcase of next-generation cloud, AI, and robotics innovations.",
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
    {
      id: "stall-1",
      stallId: "stall-1",
      exhibitionId: "ex-1",
      exhibitorEmail: "exhibitor@example.com",
      stallName: "Innovate AI Pavilion",
      stallType: "Diamond",
      tier: "Diamond",
      color: "#3b82f6",
      logoUrl: "",
      bannerUrl: "",
      documents: ["AI_Whitepaper_2026.pdf", "Product_Brochure.pdf"],
      status: "approved",
    },
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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ======================== SERVER & VITE INTEGRATION ========================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
