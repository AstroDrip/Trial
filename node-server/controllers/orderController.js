const db = require("../config/db");

// Get all orders
const getOrders = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM orders
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("❌ Failed to fetch orders:", err.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// Create a new order
const createOrder = async (req, res) => {
  try {
    const {
      id,
      customer,
      items,
      total,
      status = "pending",
      invoiceId,
    } = req.body;

    const result = await db.query(
      `
      INSERT INTO orders
        (id, customer, items, total, status, invoice_id)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        id,
        JSON.stringify(customer),
        JSON.stringify(items),
        total,
        status,
        invoiceId || null,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Failed to create order:", err.message);

    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await db.query(
      `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Failed to update order:", err.message);

    res.status(500).json({
      success: false,
      message: "Failed to update order",
    });
  }
};

module.exports = {
  getOrders,
  createOrder,
  updateOrderStatus,
};