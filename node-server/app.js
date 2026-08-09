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

// Parse allowed origins from env (comma-separated), trimming whitespace so
// entries like "http://localhost:5173, http://192.168.29.241:5173" work.
// Defaults cover local dev on both localhost and the LAN IP.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://192.168.29.241:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
}));

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
