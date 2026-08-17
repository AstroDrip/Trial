const express = require("express");
const cors = require("cors");
const app = express();

// 1. Configure allowed origins explicitly
const allowedOrigins = [
  "https://semiskitchen.in",
  "https://semiskitchen.in"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allows mobile requests, postman testing, or curl (where origin is undefined)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// 2. Explicitly handle HTTP OPTIONS Preflight requests
app.options("*", cors());

// ... rest of your route require handles and middleware (like app.use('/api', routes))

module.exports = app;
