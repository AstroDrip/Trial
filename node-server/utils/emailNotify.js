// Admin email notification via Resend.
//
// Fires a simple "new order arrived" email when a customer places an order.
// This replaces the old SSE/realtime event system — the admin no longer needs
// to watch the dashboard; they just get an email.
//
// Configuration lives in env variables (never hardcoded):
//   RESEND_API_KEY  -> your Resend API key (required to send)
//   RESEND_FROM     -> sender address (default: onboarding@resend.dev)
//   ADMIN_EMAIL     -> recipient (default: semisofficial1@gmail.com)
const { Resend } = require("resend");

async function sendNewOrderNotification() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY is not set — skipped admin email notification");
    return null;
  }

  const resend = new Resend(apiKey);
  return resend.emails.send({
    from: process.env.RESEND_FROM || "onboarding@resend.dev",
    to: process.env.ADMIN_EMAIL || "semisofficial1@gmail.com",
    subject: "🛎️ New order received",
    html: "<p>A new order has just arrived at <strong>Semi's Kitchen</strong>.</p><p>Please check your admin dashboard to review it.</p>",
  });
}

module.exports = { sendNewOrderNotification };