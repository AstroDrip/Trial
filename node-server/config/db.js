const { Pool } = require("pg");

// Connection string from env (DATABASE_URL). Works for both Neon (hosted,
// SSL-required) and a local Postgres (no SSL). We detect which one at
// startup: try SSL first (Neon), then fall back to a plain connection for
// local dev. This mirrors the logic in migrate.js so the app and the
// migration runner behave identically.
//
// Inactivity handling: the pool used to be created once with
// idleTimeoutMillis: 0 (never release idle clients), which meant the pool
// stayed open indefinitely even when nothing was using it — connections
// could pile up across serverless invocations. Now: (1) idle clients are
// released back after IDLE_CLIENT_TIMEOUT_MS of no queries on that client,
// and (2) if the whole app goes INACTIVITY_TIMEOUT_MS without a single
// query, the pool itself is torn down and lazily recreated on the next
// request, instead of sitting open indefinitely.
const IDLE_CLIENT_TIMEOUT_MS = 30_000; // pg releases an idle client after 30s
const INACTIVITY_TIMEOUT_MS = Number(process.env.DB_INACTIVITY_TIMEOUT_MS) || 5 * 60 * 1000; // pool torn down after 5 min of no activity
const INACTIVITY_CHECK_INTERVAL_MS = 60_000;

let current = null; // the live pg Pool (or null if torn down due to inactivity)
let lastActivity = Date.now();
let inactivityTimer = null;

function startInactivityWatcher() {
  if (inactivityTimer) return;
  inactivityTimer = setInterval(async () => {
    if (!current) return;
    const idleFor = Date.now() - lastActivity;
    if (idleFor < INACTIVITY_TIMEOUT_MS) return;

    const poolToClose = current;
    current = null;
    clearInterval(inactivityTimer);
    inactivityTimer = null;
    try {
      await poolToClose.end();
      console.log(`♻️  PostgreSQL pool closed after ${Math.round(idleFor / 1000)}s of inactivity (will reconnect on next query)`);
    } catch (err) {
      console.error("❌ Error closing idle PostgreSQL pool:", err.message);
    }
  }, INACTIVITY_CHECK_INTERVAL_MS);
  // Don't let this timer keep the Node process alive on its own.
  inactivityTimer.unref?.();
}

// Connection string from env (DATABASE_URL). Works for both Neon (hosted,
// SSL-required) and a local Postgres (no SSL).
function connectPool() {
  const connectionString = process.env.DATABASE_URL;
  const base = {
    connectionString,
    // Prefer prepared-style pooling for serverless (Vercel) environments.
    max: 2,
    idleTimeoutMillis: IDLE_CLIENT_TIMEOUT_MS,
    connectionTimeoutMillis: 10000,
  };

  // The first pool is created with SSL. If the server doesn't support SSL
  // (e.g. local Postgres), we detect that and fall back to a plain pool.
  const pool = new Pool({ ...base, ssl: { rejectUnauthorized: false } });
  pool.on("error", (err) => {
    console.error("❌ Unexpected error on idle PostgreSQL client:", err.message);
  });

  current = pool;

  // Probe once at startup. `pool.query` acquires a client and runs the query.
  // If the server rejects SSL, we swap in a non-SSL pool. We do this lazily and
  // catch the first failure rather than crashing the whole app.
  pool.query("SELECT 1")
    .then(() => {
      console.log("✅ Connected to PostgreSQL");
    })
    .catch(async (err) => {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("ssl")) {
        try {
          await pool.end();
        } catch {}
        const plainPool = new Pool(base);
        plainPool.on("error", (e) => console.error("❌ PostgreSQL pool error:", e.message));
        current = plainPool;
        try {
          await plainPool.query("SELECT 1");
          console.log("✅ Connected to PostgreSQL (no SSL)");
        } catch (e2) {
          console.error("❌ Database connection failed (no SSL):", e2.message);
        }
      } else {
        console.error("❌ Database connection failed:", msg);
      }
    });

  startInactivityWatcher();
}

// Returns the live pool, lazily reconnecting if it was torn down due to
// inactivity, and refreshes the last-activity timestamp.
function ensurePool() {
  lastActivity = Date.now();
  if (!current) connectPool();
  return current;
}

// Proxy query()/connect()/end() to whichever pool is current, reconnecting
// lazily if the pool was closed due to inactivity. Callers keep using the
// same API (db.query / db.connect) regardless of SSL fallback or reconnects.
module.exports = {
  query: (...args) => ensurePool().query(...args),
  connect: (...args) => ensurePool().connect(...args),
  end: (...args) => (current ? current.end(...args) : Promise.resolve()),
};
