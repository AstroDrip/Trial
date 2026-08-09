const db = require("../config/db");
const events = require("../utils/events");

// Shared SQL fragment for the order row (for getOrders / getArchivedOrders).
const ORDER_SELECT = `
  SELECT
    o.id, o.invoice_id, o.status, o.order_mode, o.notes, o.total,
    o.created_at, o.payment_status, o.paymet AS payment_method, o.archived,
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
`;

// Insert a single order (customer + order + items) inside one transaction.
// Takes an optional `orderIdOverride` so that on a PK collision we can retry
// with a server-generated suffix instead of crashing the user's request.
async function insertOrder(client, { id, invoiceId, customer, items, total, status, orderMode, notes, paymentStatus }, orderIdOverride) {
  const finalId = orderIdOverride || id;

  const custResult = await client.query(
    `INSERT INTO customers (name, phone, email, address, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [customer.name, customer.phone, customer.email || null, customer.address || null,
     customer.location?.lat || null, customer.location?.lng || null]
  );
  const customerId = custResult.rows[0].id;

  const paymentMethod = customer?.paymentMethod || "cod";

  const orderResult = await client.query(
`INSERT INTO orders (id, customer_id, invoice_id, status, order_mode, notes, total, payment_status, paymet)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [finalId, customerId, invoiceId, status || "pending", orderMode, notes || null, total, paymentStatus || "unpaid", paymentMethod]
  );

  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5)`,
      [finalId, item.id, item.qty, item.price, item.qty * item.price]
    );
  }

  return { ...orderResult.rows[0], customer, items };
}

async function createOrder({ id, invoiceId, customer, items, total, status, orderMode, notes, paymentStatus }) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Try with the client-provided id first. If it collides with an existing
    // order (possible when two users generate the same id at the same time),
    // retry once with a server-generated suffix instead of failing.
    let order;
    try {
order = await insertOrder(client, { id, invoiceId, customer, items, total, status, orderMode, notes, paymentStatus });
    } catch (err) {
      const isUniqueViolation = err?.code === "23505";
      if (isUniqueViolation) {
        await client.query("ROLLBACK");
        await client.query("BEGIN");
        const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
        order = await insertOrder(client, { id, invoiceId, customer, items, total, status, orderMode, notes, paymentStatus }, `${id}-${suffix}`);
      } else {
        throw err;
      }
    }

    await client.query("COMMIT");

    // Notify all connected admin dashboards in real time.
    events.emit("order_created", { id: order.id, invoiceId: order.invoice_id });

    return { ...order, customer, items };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getOrders() {
  const result = await db.query(`
    ${ORDER_SELECT}
    WHERE o.archived = false
    GROUP BY o.id, c.id
    ORDER BY o.created_at DESC
  `);
  return result.rows;
}

async function getArchivedOrders() {
  const result = await db.query(`
    ${ORDER_SELECT}
    WHERE o.archived = true
    GROUP BY o.id, c.id
    ORDER BY o.created_at DESC
  `);
  return result.rows;
}

// Mark a set of orders as archived. This is a shared, database-backed archive
// so every admin browser sees the same historical invoices/sales (instead of
// per-browser localStorage which could diverge between users).
async function archiveOrders(ids) {
  if (!ids || ids.length === 0) return [];
  const result = await db.query(
    `UPDATE orders SET archived = true WHERE id = ANY($1) RETURNING id`,
    [ids]
  );
  return result.rows;
}

async function updateOrderStatus(id, status) {
  // Fetch the current status first so callers can tell whether the order is
  // genuinely transitioning into `completed` (avoid double-counting revenue in
  // the sales summary if the same order is marked completed more than once).
  const before = await db.query(
    `SELECT status, total FROM orders WHERE id = $1`,
    [id]
  );
  const prev = before.rows[0];

  const result = await db.query(
    `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  const updated = result.rows[0];
  if (!updated) return null;

  return { ...updated, previousStatus: prev?.status || null };
}

async function updatePaymentStatus(id, paymentStatus) {
  const result = await db.query(
    `UPDATE orders SET payment_status = $1 WHERE id = $2 RETURNING *`,
    [paymentStatus, id]
  );
  return result.rows[0];
}

async function deleteOrder(id) {
  await db.query(`DELETE FROM orders WHERE id = $1`, [id]);
}

module.exports = { createOrder, getOrders, getArchivedOrders, archiveOrders, updateOrderStatus, updatePaymentStatus, deleteOrder };
