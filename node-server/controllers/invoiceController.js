const db = require("../config/db");
const { generateInvoicePDF, groupOrders } = require("../utils/invoiceGenerator");
const { SINGLE_ORDER_QUERY, ACCEPTED_ORDERS_QUERY, COMPLETED_ORDERS_QUERY } = require("../utils/invoiceQueries");
const { pushOrderRowsToSheet } = require("../utils/googleSheetsSync");

// GET /api/invoices/:orderId  -> streams back a single filled invoice PDF
async function getInvoice(req, res) {
  try {
    const result = await db.query(SINGLE_ORDER_QUERY, [req.params.orderId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found or has no items" });
    }

    const [order] = groupOrders(result.rows);
    const pdfBuffer = await generateInvoicePDF(order);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="invoice-${order.invoice_id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Failed to generate invoice:", err);
    res.status(500).json({ success: false, error: "Failed to generate invoice" });
  }
}

// GET /api/invoices/batch -> zips one PDF per accepted order
// (handy for an end-of-day "print everything for accepted orders" button)
async function getAcceptedInvoicesZip(req, res) {
  const archiver = require("archiver");
  try {
    const result = await db.query(ACCEPTED_ORDERS_QUERY);
    const orders = groupOrders(result.rows);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="invoices-${Date.now()}.zip"`);

    const archive = archiver("zip");
    archive.pipe(res);

    for (const order of orders) {
      const pdfBuffer = await generateInvoicePDF(order);
      archive.append(pdfBuffer, { name: `invoice-${order.invoice_id}.pdf` });
    }

    await archive.finalize();
  } catch (err) {
    console.error("❌ Failed to generate batch invoices:", err);
    res.status(500).json({ success: false, error: "Failed to generate invoices" });
  }
}

// POST /api/invoices/sync-sheet -> pushes completed-but-not-yet-synced
// orders' line items into the Google Sheet configured via GOOGLE_SHEET_ID
// (see googleSheetsSync.js for one-time setup steps), then marks them
// synced so a second click doesn't re-append the same rows.
async function syncCompletedOrdersToSheet(req, res) {
  try {
    const result = await db.query(COMPLETED_ORDERS_QUERY);
    const { appended } = await pushOrderRowsToSheet(result.rows);

    const orderIds = [...new Set(result.rows.map((r) => r.order_id))];
    if (orderIds.length > 0) {
      await db.query(`UPDATE orders SET synced_at = now() WHERE id = ANY($1)`, [orderIds]);
    }

    res.json({ success: true, appended });
  } catch (err) {
    console.error("❌ Failed to sync orders to sheet:", err);
    res.status(500).json({ success: false, error: "Failed to sync to Google Sheets" });
  }
}

module.exports = { getInvoice, getAcceptedInvoicesZip, syncCompletedOrdersToSheet };
