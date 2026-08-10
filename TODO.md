# Bug fixes

## Plan
- [x] Scan code & identify bugs
- [x] Fix `orderController.js` createOrder to pass `paymentStatus` through
- [x] Fix `App.jsx` submitOrder error handling (reset `submitting`, show error)
- [x] Fix `Admin.jsx` saveStock revert to restore previous stock value
- [x] Fix `utils/events.js` in-memory replay fallback for DB-down events
- [x] Clean up unused imports/vars in `App.jsx`
- [x] Verify: frontend build (`npm run build`) passes; backend syntax checks pass

## Payment method column rename (paymet)
- [x] `orderModel.js`: SELECT `o.paymet AS payment_method`; INSERT into `paymet` column
- [x] `sales_summary.sql`: migration now creates `paymet` column (was `payment_method`)
- [x] Frontend `mapOrder` unchanged (reads `payment_method`, still aliased from `paymet`)
- [x] Verify: backend `node --check` passes

## Admin UI enhancements
### 1. Invoices — newest first by default
- [x] `Admin.jsx`: invoice list defaults to flat "recent" view (all completed invoices sorted newest-first, no grouping)
- [x] Toggle buttons "By day" / "By week" group invoices; clicking the active toggle returns to the flat recent list
- [x] Existing day/week grouping intact; description text reflects current grouping mode

### 2. Sales — day/week toggle & breakdown
- [x] `Admin.jsx`: added `salesGroup` state ("day" | "week") with "By day" / "By week" toggle in the Sales section
- [x] Added a "Sales by day" / "Sales by week" breakdown panel listing each period's order count and revenue, newest-first
- [x] Replaced the old static "Daily sales summary" panel with the groupable breakdown

### 3. UPI checkout note
- [x] `App.jsx`: when the UPI payment option is selected, show a note that a QR code will be sent to the provided phone number
- [x] Verify: frontend `npm run build` passes

## Frontend / backend connection fix
- [x] Root cause: backend process died (Postgres idle connection terminated); frontend `.env` pointed at unreachable LAN IP `192.168.29.241:5000`
- [x] Restarted backend (`npm start`) — now on `localhost:5000`, connected to PostgreSQL
- [x] Added Vite dev proxy in `vite.config.js` (`/api` → `http://localhost:5000`)
- [x] `kitchen.jsx`: `API` now defaults to relative `/api` (same-origin) instead of an absolute host
- [x] Cleared `VITE_API_URL` in `semis-kitchen/.env` so dev uses the relative path + proxy
- [x] Verified: `http://localhost:5173/api/menu` returns 200 JSON via the proxy; `npm run build` passes

## Requested changes (this session)
1. [x] Tab order: Fried Snacks → Frozen Snacks → Biriyani & Curries (`kitchen.jsx` CATS)
2. [x] Note above the mains tab: same-day delivery not available for Biriyani & Curries
3. [x] Checkout: delivery date (calendar) + hourly time slot (11 AM–9 PM), required to place order.
   New `orders.delivery_date` / `orders.delivery_slot` columns (see `sales_summary.sql` —
   run `node migrate.js` against the DB). Shown on Admin order cards.
4. [x] "QOZYD" bold, centered, lighter-green footer on the customer page
5. [x] Replaced `googleSheetsSync.js` with the user-provided version — dedupes to
   one sheet row per order (was one row per order *item*, which is what caused
   duplicate-looking rows for multi-item orders)
6. [x] Google Sheet sync now targets `status = 'completed'` orders (was `'accepted'`);
   the "download all invoices" zip still uses `'accepted'` (separate query) so that
   feature's behavior didn't silently change too
7. [x] Removed both candidate paragraphs under "Semi's Kitchen" on the hero
   (the "Open 9:00 AM – 9:00 PM" line and the tagline sentence)
8. [x] `node-server/menu_update.sql` — idempotent migration adding the 26 new
   items (2 frozen, 3 fried, 21 mains) from the new menu photos, skipping
   items that already exist and excluding Irachi Pathiri from Frozen only.
   Also inserts matching `inventory` rows (required — Admin's price/stock
   editor only UPDATEs, so a new item needs a row to be editable there).
   Verified by running it against a local Postgres seeded with the current
   32-item menu: idempotent on re-run, correct category counts, correct
   exclusion. Run with `node migrate.js menu_update.sql`.
   ASSUMPTIONS to verify: `unit` left blank (no seed data existed to infer
   the convention from), `min_qty`/`step_qty` default to 1, `seasonal=true`
   only for the new Fish/Mutton items (per the menu's own seasonal-price
   note), and `image` filenames follow the existing prefix convention but
   have no actual photo files yet (shows "No image" until uploaded).
9. [x] `config/db.js`: pool now closes after 5 min of inactivity (configurable via
   `DB_INACTIVITY_TIMEOUT_MS`) and lazily reconnects on the next query, instead of
   staying open forever (`idleTimeoutMillis: 0`)
- [x] Verify: backend `node --check` on all touched files passes; frontend `npm run build` passes
