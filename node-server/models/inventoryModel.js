const db = require("../config/db");

async function getInventory() {
  const result = await db.query(`
    SELECT
      menu_item_id,
      selling_price,
      stock,
      available
    FROM inventory
    ORDER BY menu_item_id
  `);

  return result.rows;
}

async function updateInventory(id, data) {
  const { stock, available, price } = data;

  const result = await db.query(
    `
    UPDATE inventory
    SET
      stock = COALESCE($1, stock),
      available = COALESCE($2, available),
      selling_price = COALESCE($3, selling_price)
    WHERE menu_item_id=$4
    RETURNING *
    `,
    [stock, available, price, id]
  );

  return result.rows[0];
}

// Atomic, concurrency-safe stock decrement. Uses a single UPDATE so two
// admins accepting orders at the same time cannot lose updates (no read-then-
// write race). Stock is clamped at 0.
async function decrementStock(menuItemId, qty) {
  const result = await db.query(
    `UPDATE inventory
        SET stock = GREATEST(0, stock - $1)
      WHERE menu_item_id = $2
      RETURNING *`,
    [qty, menuItemId]
  );
  return result.rows[0];
}

module.exports = {
  getInventory,
  updateInventory,
  decrementStock,
};
