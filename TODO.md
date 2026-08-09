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
