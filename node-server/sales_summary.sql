-- sales_summary table (for use with Neon / any PostgreSQL)
-- Run this once in your Neon database if the table wasn't already created.

CREATE TABLE IF NOT EXISTS sales_summary (
  summary_date DATE PRIMARY KEY,
  orders_count INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0
);

-- Add payment tracking to the orders table (run once).
-- payment_status: 'paid' | 'unpaid'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- Payment method chosen at checkout: 'cod' (Cash on Delivery) | 'upi'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymet TEXT DEFAULT 'cod';

-- Shared, database-backed archive flag. Previously archived orders were kept
-- in each admin browser's localStorage, which diverged across users. Now all
-- admins share the same archive via PostgreSQL.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------------
-- Real-time event outbox used by the SSE system (utils/events.js). This lets
-- the event-driven admin dashboard replay missed events across multiple
-- Vercel serverless instances (since each instance is stateless).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS realtime_events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_realtime_events_id ON realtime_events (id);

-- ---------------------------------------------------------------------------
-- Performance indexes (run once on Neon). These speed up the frequent
-- queries used by the app: order listing, payment filtering, and inventory
-- lookups. Indexes become increasingly important as order volume grows and
-- with multiple concurrent users.
-- ---------------------------------------------------------------------------

-- Speeds up the heavy getOrders() query (ORDER BY created_at DESC + status)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);

-- Speeds up joining order_items -> menu_items in getOrders()
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items (menu_item_id);

-- Speeds up menu + inventory lookups
CREATE INDEX IF NOT EXISTS idx_inventory_menu_item_id ON inventory (menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items (category_id);

-- Concurrent order inserts: ensures unique order IDs are indexed (already PK,
-- but keeps composite lookups fast when joining by customer)
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
