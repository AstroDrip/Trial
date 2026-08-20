const db = require("../config/db");

async function getMenu() {
  const result = await db.query(`
    SELECT
      m.id,
      m.category_id AS cat,
      m.name,
      CASE
        WHEN m.category_id = 'mains' AND m.min_qty IN (10, 20) THEN '1 Piece'
        ELSE m.unit
      END AS unit,
      m.min_qty AS "minQty",
      m.step_qty AS "step",
      m.seasonal,
      m.image AS img,
      COALESCE(i.selling_price, m.default_price) AS price,
      COALESCE(i.stock, 0) AS stock,
      COALESCE(i.available, true) AS available
    FROM menu_items m
    JOIN categories c ON c.id = m.category_id
    LEFT JOIN inventory i ON i.menu_item_id = m.id
    ORDER BY c.id, m.name;
  `);
  return result.rows;
}

module.exports = { getMenu };
