const orderModel = require("../models/orderModel");

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
    const { id, invoiceId, customer, items, total, status } = req.body;
    const orderMode = customer?.mode || "Delivery";

    const order = await orderModel.createOrder({
      id, invoiceId, customer, items, total, status,
      orderMode, deliveryTime: null, notes: customer?.notes,
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
    res.json({ success: true, data: order });
  } catch (err) {
    console.error("❌ Failed to update order:", err.message);
    res.status(500).json({ success: false, message: "Failed to update order" });
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

module.exports = { getOrders, createOrder, updateOrderStatus, deleteOrder };