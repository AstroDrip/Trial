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
