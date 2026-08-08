const { Pool } = require("pg");

// Connection string from env (DATABASE_URL). Works for both Neon (hosted,
// SSL-required) and a local Postgres (no SSL). We detect which one at
// startup: try SSL first (Neon), then fall back to a plain connection for
// local dev. This mirrors the logic in migrate.js so the app and the
// migration runner behave identically.
function createPool() {
  const connectionString = process.env.DATABASE_URL;
  const base = {
    connectionString,
    // Prefer prepared-style pooling for serverless (Vercel) environments.
    max: 2,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
  };

  // The first pool is created with SSL. If the server doesn't support SSL
  // (e.g. local Postgres), we detect that and fall back to a plain pool.
  const pool = new Pool({ ...base, ssl: { rejectUnauthorized: false } });

  pool.on("error", (err) => {
    console.error("❌ Unexpected error on idle PostgreSQL client:", err.message);
  });

  // Probe once at startup. `pool.query` acquires a client and runs the query.
  // If the server rejects SSL, we swap in a non-SSL pool. We do this lazily and
  // catch the first failure rather than crashing the whole app.
  let ready = false;
  let current = pool;
  pool.query("SELECT 1")
    .then(() => {
      ready = true;
      console.log("✅ Connected to PostgreSQL");
    })
    .catch(async (err) => {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("ssl")) {
        try {
          await pool.end();
        } catch {}
        current = new Pool(base);
        current.on("error", (e) => console.error("❌ PostgreSQL pool error:", e.message));
        try {
          await current.query("SELECT 1");
          ready = true;
          console.log("✅ Connected to PostgreSQL (no SSL)");
        } catch (e2) {
          console.error("❌ Database connection failed (no SSL):", e2.message);
        }
      } else {
        console.error("❌ Database connection failed:", msg);
      }
    });

  // Return an object that proxies query() to whichever pool is current, so
  // callers keep using the same API (db.query / db.connect) regardless of
  // whether we ended up on SSL or plain.
  return {
    query: (...args) => current.query(...args),
    connect: (...args) => current.connect(...args),
    end: (...args) => current.end(...args),
  };
}

module.exports = createPool();
