require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const inventoryRoutes = require("./routes/inventoryRoutes");
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const salesRoutes = require("./routes/salesRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const events = require("./utils/events");

const app = express();

// Explicitly list all authorized dev and production domains in this array.
// To add a new domain WITHOUT a code change, set the ALLOWED_ORIGINS env var
// on the backend deployment (Vercel -> the project -> Settings -> Environment
// Variables) to a comma-separated list extra origins, e.g.
//   ALLOWED_ORIGINS=https://trial-tetrix1.vercel.app
// Origins are matched exactly (scheme + host + port), so include https:// and
// a www vs. bare domain separately if you use both.
const DEFAULT_ORIGINS = [
  "https://trial-tetrix1.vercel.app",
  "https://semiskitchen.in",
  "https://www.semiskitchen.in",
  "http://localhost:5173",
  "http://192.168.29.241:5173"
];

// Append any extra origins from env (comma-separated), trimming whitespace so
// entries like "http://localhost:5173, https://trial-tetrix1.vercel.app" work.
const allowedOrigins = DEFAULT_ORIGINS.concat(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

// 2. Use a dynamic matching function for multi-domain support
app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (like server-to-server, Postman, or mobile tests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS policy restriction: Domain unauthorized"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// 3. Explicitly intercept browser security handshake preflight checks.
// (Express 5 / path-to-regexp v8 requires a NAMED splat instead of a bare "*")
app.options("/*splat", cors());

app.use(express.json());

app.use("/api/menu", menuRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/invoices", invoiceRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Semis Kitchen API is running"
  });
});

// ---------------------------------------------------------------------------
// Real-time event stream (Server-Sent Events) for the admin dashboard.
// On connect, the client sends `Last-Event-ID` (either a header or a query
// param `?last=`). We replay any events persisted after that id, then stream
// new events live. This keeps the admin UI event-driven (no polling) while
// remaining correct even across multiple Vercel serverless instances.
// ---------------------------------------------------------------------------
app.get("/api/events", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering on Vercel/NGINX
  res.flushHeaders?.();

  // Let the client send heartbeats so idle connections aren't killed.
  const send = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {}
  };

  const lastEventId = req.query.last || req.headers["last-event-id"] || 0;

  // Replay missed events from the shared outbox (cross-instance safety).
  try {
    const missed = await events.fetchSince(lastEventId);
    for (const evt of missed) {
      res.write(`id: ${evt.id}\n`);
      send({ type: evt.type, payload: evt.payload });
    }
  } catch (err) {
    console.warn("⚠️ SSE replay error:", err.message);
  }

  // Sentinel marking "replay finished, everything from here is live". No
  // `id:` line — it isn't a real outbox event, so it shouldn't advance the
  // client's Last-Event-ID. Lets the admin dashboard tell catch-up events
  // (missed while the tab was closed) apart from ones arriving in real time,
  // so it can batch them into a single "N orders came in while you were
  // away" notice instead of re-pinging once per missed order.
  send({ type: "replay_complete" });

  // Live subscription for this instance.
  const unsubscribe = events.subscribe((evt) => {
    res.write(`id: ${evt.id}\n`);
    send({ type: evt.type, payload: evt.payload });
  });

  // Heartbeat to keep the connection alive.
  const heartbeat = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {}
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    try {
      res.end();
    } catch {}
  });
});

db.query("SELECT NOW()")
  .then(() => {
    console.log("✅ Connected to PostgreSQL");
  })
  .catch((err) => {
    console.error("❌ Database connection failed:");
    console.error(err.message);
  });

module.exports = app;
