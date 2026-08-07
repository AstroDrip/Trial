-- sales_summary table (for use with Neon / any PostgreSQL)
-- Run this once in your Neon database if the table wasn't already created.

CREATE TABLE IF NOT EXISTS sales_summary (
  summary_date DATE PRIMARY KEY,
  orders_count INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0
);
