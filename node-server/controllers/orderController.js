const orderModel = require("../models/orderModel");
const salesModel = require("../models/salesModel");

const getOrders = async (req, res) => {
  try {
    const orders = await orderModel.getOrders();
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("❌ Failed to fetch orders:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

const createOrder = async (req, res) => {
  try {
    const { id, invoiceId, customer, items, total, status, paymentStatus } = req.body;
    const orderMode = customer?.mode || "Delivery";

    const order = await orderModel.createOrder({
      id, invoiceId, customer, items, total, status,
      orderMode, deliveryTime: null, notes: customer?.notes, paymentStatus,
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error("❌ Failed to create order:", err.message);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await orderModel.updateOrderStatus(id, status);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Populate the daily sales summary when an order is marked completed.
    // Only count it the first time it transitions INTO `completed` (not when
    // it's already completed, and not when it's moved to another status).
    if (status === "completed" && order.previousStatus !== "completed") {
      const summaryDate = new Date(order.created_at)
        .toISOString()
        .slice(0, 10);
      await salesModel.upsertSummary({
        date: summaryDate,
        ordersDelta: 1,
        revenueDelta: Number(order.total),
      });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    console.error("❌ Failed to update order:", err.message);
    res.status(500).json({ success: false, message: "Failed to update order" });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const order = await orderModel.updatePaymentStatus(id, paymentStatus);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error("❌ Failed to update payment status:", err.message);
    res.status(500).json({ success: false, message: "Failed to update payment status" });
  }
};

const deleteOrder = async (req, res) => {
  try {
    await orderModel.deleteOrder(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to delete order:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete order" });
  }
};

const getArchivedOrders = async (req, res) => {
  try {
    const orders = await orderModel.getArchivedOrders();
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("❌ Failed to fetch archived orders:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch archived orders" });
  }
};

const archiveOrders = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids array is required" });
    }
    const archived = await orderModel.archiveOrders(ids);
    res.json({ success: true, data: archived });
  } catch (err) {
    console.error("❌ Failed to archive orders:", err.message);
    res.status(500).json({ success: false, message: "Failed to archive orders" });
  }
};

module.exports = { getOrders, createOrder, updateOrderStatus, updatePaymentStatus, deleteOrder, getArchivedOrders, archiveOrders };
