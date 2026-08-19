const orderModel = require("../models/orderModel");
const salesModel = require("../models/salesModel");
const { sendInvoiceNotification, sendDeclineNotification } = require("../utils/whatsappNotify");
const { sendNewOrderNotification } = require("../utils/emailNotify");

// Meta/WhatsApp notifications are paused by default. The integration code is
// intentionally retained and can be re-enabled later by setting this exact
// environment variable to "true" in the backend deployment.
const WHATSAPP_NOTIFICATIONS_ENABLED =
  process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true";

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
      orderMode, notes: customer?.notes, paymentStatus,
    });

    // Notify the admin by email that a new order arrived. Awaiting the send
    // makes sure it completes before this serverless function returns (a
    // fire-and-forget call could be killed mid-flight) — but a send failure
    // never fails the order itself, it's only logged.
    try {
      await sendNewOrderNotification();
    } catch (err) {
      console.error("❌ Failed to send admin new-order email:", err.message);
    }

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

    // Automatic WhatsApp notifications on genuine status transitions only
    // (guarded by previousStatus, same pattern as the sales-summary block
    // above) — so re-accepting/re-declining an already-accepted/declined
    // order doesn't re-send the message. These are awaited (not
    // fire-and-forget) so the send actually completes before this
    // serverless function returns, rather than risking being killed
    // mid-flight — but a WhatsApp failure never fails the status update
    // itself, it's only logged.
    if (WHATSAPP_NOTIFICATIONS_ENABLED && status === "accepted" && order.previousStatus !== "accepted") {
      if (!order.customer_phone) {
        console.warn(`⚠️ Order ${order.id} has no phone on file — skipped WhatsApp invoice notification`);
      } else if (!process.env.PUBLIC_API_BASE_URL) {
        console.warn("⚠️ PUBLIC_API_BASE_URL not set — skipped WhatsApp invoice notification");
      } else {
        try {
          const invoiceUrl = `${process.env.PUBLIC_API_BASE_URL}/api/invoices/${order.id}`;
          await sendInvoiceNotification(order.customer_phone, order.customer_name || "Customer", invoiceUrl, order.total);
        } catch (err) {
          console.error(`❌ Failed to send accepted-order WhatsApp notification for ${order.id}:`, err.message);
        }
      }
    } else if (WHATSAPP_NOTIFICATIONS_ENABLED && status === "declined" && order.previousStatus !== "declined") {
      if (!order.customer_phone) {
        console.warn(`⚠️ Order ${order.id} has no phone on file — skipped WhatsApp decline notification`);
      } else {
        try {
          await sendDeclineNotification(order.customer_phone, order.customer_name || "Customer");
        } catch (err) {
          console.error(`❌ Failed to send declined-order WhatsApp notification for ${order.id}:`, err.message);
        }
      }
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

// DELETE /api/orders/paid-synced -> permanently removes orders that are
// completed, paid, and already confirmed synced to the Google Sheet. Meant
// as a manual DB-size cleanup action (see /admin's Invoices tab) — the sheet
// is the durable record for these once synced, so the DB copy is disposable.
const deletePaidSyncedOrders = async (req, res) => {
  try {
    const deletedCount = await orderModel.deletePaidSyncedOrders();
    res.json({ success: true, deletedCount });
  } catch (err) {
    console.error("❌ Failed to delete paid+synced orders:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete paid+synced orders" });
  }
};

module.exports = { getOrders, createOrder, updateOrderStatus, updatePaymentStatus, deleteOrder, getArchivedOrders, archiveOrders, deletePaidSyncedOrders };
