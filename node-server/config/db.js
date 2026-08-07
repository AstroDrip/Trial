const { Pool } = require("pg");

// Uses DATABASE_URL from env. For Neon, use the "Pooled connection" string
// (the one with a port like -pooler or the standard one with sslmode=require).
// We set ssl for Neon's hosted Postgres.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Prefer prepared-style pooling for serverless (Vercel) environments.
  max: 2,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
});

module.exports = pool;
