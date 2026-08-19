const db = require("../config/db");
const { generateInvoicePDF, groupOrders } = require("../utils/invoiceGenerator");
const { SINGLE_ORDER_QUERY, ACCEPTED_ORDERS_QUERY, COMPLETED_ORDERS_QUERY } = require("../utils/invoiceQueries");
const { pushOrderRowsToSheet } = require("../utils/googleSheetsSync");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Public, branded page intended for links manually shared with customers.
// Unlike a raw PDF response, this HTML can provide WhatsApp/social link-preview
// metadata and a readable thank-you message before the customer opens the PDF.
async function getInvoiceSharePage(req, res) {
  const orderId = String(req.params.orderId || "").trim();
  if (!orderId) return res.status(400).send("Order ID is required");

  const safeOrderId = escapeHtml(orderId);
  const encodedOrderId = encodeURIComponent(orderId);
  const publicOrigin = (process.env.PUBLIC_SITE_URL || "https://semiskitchen.in").replace(/\/$/, "");
  const pageUrl = `${publicOrigin}/invoice/${encodedOrderId}`;
  const pdfUrl = `${publicOrigin}/api/invoices/${encodedOrderId}`;
  const previewDescription = "View your invoice from Semi’s Kitchen.";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your invoice | Semi's Kitchen</title>
  <meta name="description" content="${escapeHtml(previewDescription)}">
  <meta property="og:title" content="Your invoice from Semi's Kitchen">
  <meta property="og:description" content="${escapeHtml(previewDescription)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Your invoice from Semi's Kitchen">
  <meta name="twitter:description" content="${escapeHtml(previewDescription)}">
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6edd7;color:#3f3b24;font-family:Arial,sans-serif}.card{width:min(100%,620px);background:#fff8e8;border:1px solid #e8d7b5;border-radius:28px;padding:36px;box-shadow:0 20px 50px rgba(63,59,36,.12);text-align:center}h1{margin:0 0 18px;font-family:Georgia,serif;font-size:clamp(30px,7vw,46px)}p{white-space:pre-line;line-height:1.75;color:#6f6657}.id{margin:24px 0 8px;font-size:13px;color:#8a806f}.button{display:inline-block;margin-top:20px;padding:14px 24px;border-radius:999px;background:#6f6f32;color:#fff8e8;text-decoration:none;font-weight:700}
  </style>
</head>
<body><main class="card"><h1>Your invoice is ready</h1><p>Open your Semi’s Kitchen invoice using the button below.</p><div class="id">Order ${safeOrderId}</div><a class="button" href="${escapeHtml(pdfUrl)}">View invoice</a></main></body>
</html>`);
}

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

module.exports = { getInvoice, getInvoiceSharePage, getAcceptedInvoicesZip, syncCompletedOrdersToSheet };
