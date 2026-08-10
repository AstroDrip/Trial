// One-off migration runner.
// Applies the SQL in ./sales_summary.sql (idempotent — safe to re-run) to the
// database configured by DATABASE_URL in ./.env or the environment.
//
// Usage:
//   node migrate.js
//
// It tries to connect with SSL first (Neon / Vercel), then falls back to a
// plain local connection if the server doesn't support SSL. Statement-level
// error handling means one failing statement won't stop the rest.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set. Add it to node-server/.env or the environment.");
  process.exit(1);
}

const sqlFile = path.join(__dirname, process.argv[2] || "sales_summary.sql");
const sql = fs.readFileSync(sqlFile, "utf8");

// Split on a semicolon immediately followed by a newline (or end of string).
// This keeps each statement separate so additions (ALTER/CREATE TABLE) run
// before the indexes that depend on them. Comments are stripped per statement.
function splitStatements(script) {
  return script
    .split(/;[ \t]*\r?\n/)
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter((s) => s.length > 0);
}

async function run() {
  const statements = splitStatements(sql);
  console.log(`📄 Found ${statements.length} SQL statement(s) in sales_summary.sql`);

  // Try SSL connection first (Neon/Vercel), then plain (local dev).
  const attempts = [
    { ssl: { rejectUnauthorized: false } },
    { ssl: false },
  ];
  let pool = null;
  let lastErr = null;

  for (const cfg of attempts) {
    try {
      pool = new Pool({ connectionString, ...cfg, connectionTimeoutMillis: 10000 });
      await pool.query("SELECT NOW()");
      console.log(`✅ Connected (${cfg.ssl ? "SSL" : "no SSL"})`);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      await pool.end().catch(() => {});
      pool = null;
    }
  }

  if (!pool) {
    console.error("❌ Could not connect to the database.");
    console.error(lastErr?.message || lastErr);
    process.exit(1);
  }

  let ok = 0;
  let failed = 0;
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      ok++;
      console.log(`  ✔ ${stmt.slice(0, 70)}${stmt.length > 70 ? "…" : ""}`);
    } catch (err) {
      failed++;
      console.log(`  ✘ ${stmt.slice(0, 70)}${stmt.length > 70 ? "…" : ""}`);
      console.log(`      → ${err.message}`);
    }
  }

  await pool.end();
  console.log(`\n✅ Done: ${ok} applied, ${failed} failed.`);
  if (failed > 0) {
    console.log("Note: failures are usually because a column/table already exists,");
    console.log("or the referenced table (e.g. orders) is missing. The SQL uses");
    console.log('IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, so re-running is safe.');
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error("❌ Migration aborted:", err.message);
  process.exit(1);
});
