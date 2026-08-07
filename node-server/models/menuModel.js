const db = require("../config/db");

async function getMenu() {
  const result = await db.query(`
    SELECT
      m.id,
      m.category_id,
      c.name AS category,
      m.name,
      m.unit,
      m.min_qty,
      m.step_qty,
      m.seasonal,
      m.image,

      COALESCE(i.selling_price, m.default_price) AS price,
      i.stock,
      i.available

    FROM menu_items m

    JOIN categories c
      ON c.id = m.category_id

    LEFT JOIN inventory i
      ON i.menu_item_id = m.id

    ORDER BY c.id, m.name;
  `);

  return result.rows;
}

module.exports = {
  getMenu,
};