const WHATSAPP_API_VERSION = "v21.0";

// Normalize Indian phone numbers: a bare 10-digit number gets the +91 country
// code, an already-international 12-digit (with country code) is passed
// through, and anything else is returned as-is.
function normalizeIndianPhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

// Low-level sender used by the notification helpers below. Converts the raw
// Graph API response into a real error (with Meta's message) instead of failing
// silently, so callers can log what actually went wrong.
async function sendWhatsAppText(customerPhone, body) {
  const to = normalizeIndianPhone(customerPhone);
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_PERMANENT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error?.message || `WhatsApp API returned ${res.status}`;
    throw new Error(message);
  }
  return data;
}

async function sendInvoiceNotification(customerPhone, invoiceUrl, orderTotal) {
  return sendWhatsAppText(
    customerPhone,
    `Thanks for ordering from Semi's Kitchen! Your total is ₹${orderTotal}.\n\nInvoice: ${invoiceUrl}`
  );
}

async function sendDeclineNotification(customerPhone) {
  return sendWhatsAppText(
    customerPhone,
    "We're sorry — we're unable to take your order with Semi's Kitchen right now. Please try again later."
  );
}

module.exports = { sendWhatsAppText, sendInvoiceNotification, sendDeclineNotification, normalizeIndianPhone };