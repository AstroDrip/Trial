require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const inventoryRoutes = require("./routes/inventoryRoutes");
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const salesRoutes = require("./routes/salesRoutes");

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");

app.use(cors({
  origin: allowedOrigins,
}));

app.use(express.json());

app.use("/api/menu", menuRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sales", salesRoutes);

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
