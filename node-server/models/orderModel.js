const db = require("../config/db");

async function createOrder({ id, invoiceId, customer, items, total, status, orderMode, deliveryTime, notes }) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const custResult = await client.query(
      `INSERT INTO customers (name, phone, email, address, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [customer.name, customer.phone, customer.email || null, customer.address || null,
       customer.location?.lat || null, customer.location?.lng || null]
    );
    const customerId = custResult.rows[0].id;

    const orderResult = await client.query(
      `INSERT INTO orders (id, customer_id, invoice_id, status, order_mode, delivery_time, notes, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, customerId, invoiceId, status || "pending", orderMode, deliveryTime || null, notes || null, total]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, item.id, item.qty, item.price, item.qty * item.price]
      );
    }

    await client.query("COMMIT");
    return { ...orderResult.rows[0], customer, items };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getOrders() {
  const result = await db.query(`
    SELECT
      o.id, o.invoice_id, o.status, o.order_mode, o.delivery_time, o.notes, o.total, o.created_at,
      c.name AS customer_name, c.phone AS customer_phone, c.address AS customer_address,
      c.latitude, c.longitude,
      COALESCE(
        json_agg(
          json_build_object('id', oi.menu_item_id, 'name', mi.name, 'qty', oi.quantity, 'price', oi.unit_price)
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) AS items
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
    GROUP BY o.id, c.id
    ORDER BY o.created_at DESC
  `);
  return result.rows;
}

async function updateOrderStatus(id, status) {
  const result = await db.query(
    `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
}

async function deleteOrder(id) {
  await db.query(`DELETE FROM orders WHERE id = $1`, [id]);
}

module.exports = { createOrder, getOrders, updateOrderStatus, deleteOrder };