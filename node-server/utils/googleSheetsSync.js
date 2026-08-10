const { google } = require("googleapis");

// --- One-time setup (do this in Google Cloud Console, not in code) ---
// 1. Create/select a project -> APIs & Services -> Library -> enable "Google Sheets API".
// 2. APIs & Services -> Credentials -> Create Credentials -> Service account.
// 3. Open the service account -> Keys -> Add Key -> Create new key -> JSON.
// 4. Open your target Google Sheet -> Share -> paste the service account's
//    client_email -> give it Editor access.
// 5. Copy the spreadsheet ID from its URL.
//
// --- Env vars to set on Vercel (Settings -> Environment Variables) ---
// GOOGLE_SERVICE_ACCOUNT_EMAIL = client_email from the JSON key
// GOOGLE_PRIVATE_KEY           = private_key from the JSON key, with real
//                                 newlines escaped as \n (paste as one line)
// GOOGLE_SHEET_ID              = the spreadsheet ID from step 5

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// rows: raw pg result rows (one row per order item). Collapses to ONE sheet row
// per order with only the fields needed for an order-level log.
async function pushOrderRowsToSheet(rows, sheetName = "Orders") {
  if (!rows.length) return { appended: 0 };

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const seen = new Set();
  const values = [];
  for (const r of rows) {
    if (seen.has(r.order_id)) continue;
    seen.add(r.order_id);
    values.push([
      r.invoice_id,
      r.order_id,
      new Date(r.created_at).toISOString(),
      r.name,
      r.phone,
      r.total,
      r.payment_method,
    ]);
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  return { appended: values.length };
}

async function writeHeaderRow(sheetName = "Orders") {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const header = ["invoice_id", "order_id", "created_at", "name", "phone", "total", "payment_method"];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [header] },
  });
}

module.exports = { pushOrderRowsToSheet, writeHeaderRow };
