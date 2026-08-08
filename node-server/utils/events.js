// Lightweight realtime event bus for the Vercel serverless backend.
//
// Because Vercel serverless functions are stateless and may run across
// multiple instances, an in-memory EventEmitter alone cannot reliably reach
// every connected admin client. To keep this robust without a third-party
// service, we combine:
//
//   1. An in-memory EventEmitter for the common single-instance case (fast,
//      zero-latency push to clients connected to the SAME instance).
//   2. A DB-backed outbox table (realtime_events) so that clients connected
//      to OTHER instances can poll/replay events they missed. This makes the
//      system event-driven AND safe across multiple serverless instances.
//
// Lifecycle on a serverless platform: each warm instance keeps its own
// in-memory listeners. When an event is emitted, we push to local listeners
// immediately AND persist it to the DB. Clients use SSE with a "last event id"
// so any instance can replay missed events from the DB on connect.

const { EventEmitter } = require("events");

// In-memory bus for same-instance delivery.
const bus = new EventEmitter();
bus.setMaxListeners(100);

// Keep a small in-memory ring buffer as an extra fast cache for replay.
const RECENT_LIMIT = 200;
const recent = []; // [{ id, type, payload, createdAt }]

let emitSeq = 0;

/**
 * Persist an event to the DB outbox table so other instances / clients that
 * reconnect can replay it. Best-effort; if the table doesn't exist yet or DB
 * is down, we still deliver to local listeners.
 */
async function persist({ type, payload }) {
  try {
    const db = require("../config/db");
    const createdAt = new Date().toISOString();
    const result = await db.query(
      `INSERT INTO realtime_events (type, payload, created_at)
       VALUES ($1, $2, $3::timestamptz) RETURNING id, created_at`,
      [type, JSON.stringify(payload || {}), createdAt]
    );
    return result.rows[0];
  } catch (err) {
    // Table may not exist yet (migration pending) — non-fatal.
    console.warn("⚠️ realtime_events persist skipped:", err.message);
    return null;
  }
}

/**
 * Emit an event to local listeners and persist it to the outbox.
 * @param {string} type  e.g. "order_created", "inventory_updated"
 * @param {object} payload
 */
async function emit(type, payload = {}) {
  emitSeq += 1;

  // Persist to the shared outbox FIRST so we get a real numeric id (the BIGSERIAL
  // primary key). This id is what clients use for `Last-Event-ID` replay, and it
  // must be numeric for the `WHERE id > $1` query. If persistence fails (e.g. the
  // table doesn't exist yet), fall back to a numeric in-memory id so the stream
  // still works in the same instance.
  const persisted = await persist({ type, payload });
  const rec = {
    id: persisted ? Number(persisted.id) : -emitSeq, // negative => not in DB, same-instance only
    type,
    payload,
    createdAt: persisted ? persisted.created_at : new Date(),
  };

  // Fast path: deliver to this instance's listeners.
  bus.emit("event", rec);
  bus.emit(type, rec);

  // Keep a small in-memory cache for replay.
  recent.push(rec);
  if (recent.length > RECENT_LIMIT) recent.shift();
}

/**
 * Query the DB outbox for events newer than `lastEventId`, used to replay
 * missed events to a client that connects to a different instance.
 * @param {string} lastEventId
 */
async function fetchSince(lastEventId) {
  try {
    const db = require("../config/db");
    // Only accept a positive numeric id. Anything else (undefined, "NaN", a
    // non-numeric string, negative same-instance id) is treated as 0 so the
    // bigint comparison never receives garbage.
    const parsed = Number(lastEventId);
    const since = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
    const result = await db.query(
      `SELECT id, type, payload, created_at
         FROM realtime_events
        WHERE id > $1
        ORDER BY id ASC
        LIMIT 500`,
      [since]
    );
    return result.rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.warn("⚠️ realtime_events replay failed:", err.message);
    // Fall back to the in-memory ring buffer. Only events NEWER than the
    // requested id should be re-sent so a reconnecting client isn't sent
    // older/duplicate ones. When the DB is down, events were never persisted,
    // so they carry negative ids — those must be included too (treat them as
    // always "newer than" any positive/zero `since`). Hence we only filter out
    // positive ids that are <= `since`.
    const sinceN = Number(since) || 0;
    return recent.filter((r) => Number(r.id) > sinceN || Number(r.id) < 0);
  }
}

function subscribe(fn) {
  bus.on("event", fn);
  return () => bus.off("event", fn);
}

module.exports = { emit, subscribe, fetchSince, recent };
