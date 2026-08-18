const WHATSAPP_API_VERSION = "v21.0";

/**
 * Normalize Indian phone numbers.
 *
 * 10 digits  -> prepend 91
 * 12 digits starting with 91 -> pass through
 * anything else -> return digits as-is
 */
function normalizeIndianPhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");

  if (digits.length === 10) return "91" + digits;

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  return digits;
}

/**
 * Low-level WhatsApp API request.
 */
async function sendWhatsAppMessage(payload) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_PERMANENT_TOKEN;

  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
  }

  if (!accessToken) {
    throw new Error("WHATSAPP_PERMANENT_TOKEN is not configured");
  }

  const url =
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/` +
    `${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      ...payload,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.error?.message ||
      `WhatsApp API returned ${res.status}`;

    throw new Error(message);
  }

  return data;
}

/**
 * Send the approved "order_accepted" Utility template.
 *
 * Template:
 *
 * Hi {{1}},
 *
 * Your order has been accepted.
 *
 * Order total: ₹{{2}}
 *
 * Invoice: {{3}}
 *
 * Our team will contact you by phone regarding payment.
 */
async function sendInvoiceNotification(
  customerPhone,
  customerName,
  invoiceUrl,
  orderTotal
) {
  const to = normalizeIndianPhone(customerPhone);

  return sendWhatsAppMessage({
    to,
    type: "template",
    template: {
      name: "order_accepted",
      language: {
        code: "en_US",
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: String(customerName),
            },
            {
              type: "text",
              text: String(orderTotal),
            },
            {
              type: "text",
              text: String(invoiceUrl),
            },
          ],
        },
      ],
    },
  });
}

/**
 * Send the approved "order_declined" Utility template.
 *
 * Template:
 *
 * Hi {{1}},
 *
 * Unfortunately, we're unable to accept your order from
 * Semi’s Kitchen at this time.
 *
 * Please try again later.
 *
 * Thank you for understanding.
 */
async function sendDeclineNotification(
  customerPhone,
  customerName
) {
  const to = normalizeIndianPhone(customerPhone);

  return sendWhatsAppMessage({
    to,
    type: "template",
    template: {
      name: "order_declined",
      language: {
        code: "en_US",
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: String(customerName),
            },
          ],
        },
      ],
    },
  });
}

/**
 * Optional helper for free-form text.
 *
 * Use this only when WhatsApp's messaging rules allow
 * a free-form text message in the existing conversation.
 */
async function sendWhatsAppText(customerPhone, body) {
  const to = normalizeIndianPhone(customerPhone);

  return sendWhatsAppMessage({
    to,
    type: "text",
    text: {
      body: String(body),
    },
  });
}

module.exports = {
  sendWhatsAppText,
  sendInvoiceNotification,
  sendDeclineNotification,
  normalizeIndianPhone,
};