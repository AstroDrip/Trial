// Invoice queries written against the Semis Kitchen schema.
//
// Notes on the schema:
//   - orders.id            -> the order id (e.g. SKxxxx)
//   - orders.invoice_id    -> the invoice id (e.g. INV-yyyymmdd-xxxx)
//   - orders.paymet        -> payment method ('cod' | 'upi')
//   - orders.status        -> 'pending' | 'accepted' | 'declined' | 'completed'
//   - order_items.menu_item_id -> FK to menu_items.id (the item's *name* lives
//     on menu_items.name, so we join to get a human-readable item name)
//
// The batch/sync queries target 'accepted' orders (per product decision).

const SINGLE_ORDER_QUERY = `
  SELECT
    o.invoice_id,
    o.id AS order_id,
    o.created_at,

    c.name,
    c.phone,

    oi.id AS order_item_id,
    mi.name AS item_name,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,

    o.total,
    o.paymet AS payment_method

  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN order_items oi ON o.id = oi.order_id
  JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE o.id = $1;
`;

// Batch version — every accepted order's line items in one result set.
// groupOrders() in invoiceGenerator.js splits this back into one object
// per order (use this for a "generate all accepted invoices" job).
const ACCEPTED_ORDERS_QUERY = `
  SELECT
    o.invoice_id,
    o.id AS order_id,
    o.created_at,

    c.name,
    c.phone,

    oi.id AS order_item_id,
    mi.name AS item_name,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,

    o.total,
    o.paymet AS payment_method

  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN order_items oi ON o.id = oi.order_id
  JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE o.status = 'accepted'
  ORDER BY o.id;
`;

module.exports = { SINGLE_ORDER_QUERY, ACCEPTED_ORDERS_QUERY };
