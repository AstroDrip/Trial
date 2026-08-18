require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const inventoryRoutes = require("./routes/inventoryRoutes");
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const salesRoutes = require("./routes/salesRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");

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
  "https://semiskitchen.vercel.app",
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

db.query("SELECT NOW()")
  .then(() => {
    console.log("✅ Connected to PostgreSQL");
  })
  .catch((err) => {
    console.error("❌ Database connection failed:");
    console.error(err.message);
  });

module.exports = app;
