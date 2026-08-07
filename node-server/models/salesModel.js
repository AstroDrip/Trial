const db = require("../config/db");

// Aggregate sales from the sales_summary table.
// Expects a row per summary_date with orders_count and revenue.
async function getSalesSummary() {
  const result = await db.query(`
    SELECT
      summary_date AS date,
      orders_count,
      revenue
    FROM sales_summary
    ORDER BY summary_date DESC
  `);
  return result.rows;
}

// Upsert a day's summary (used when an order is completed/archived).
async function upsertSummary({ date, ordersDelta = 0, revenueDelta = 0 }) {
  const result = await db.query(
    `
    INSERT INTO sales_summary (summary_date, orders_count, revenue)
    VALUES ($1, $2, $3)
    ON CONFLICT (summary_date)
    DO UPDATE SET
      orders_count = sales_summary.orders_count + EXCLUDED.orders_count,
      revenue = sales_summary.revenue + EXCLUDED.revenue
    RETURNING *
    `,
    [date, ordersDelta, revenueDelta]
  );
  return result.rows[0];
}

module.exports = { getSalesSummary, upsertSummary };
