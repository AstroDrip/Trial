const express = require("express");
const router = express.Router();
const { getInvoice, getAcceptedInvoicesZip, syncCompletedOrdersToSheet } = require("../controllers/invoiceController");

router.get("/batch", getAcceptedInvoicesZip); // keep above /:orderId
router.post("/sync-sheet", syncCompletedOrdersToSheet); // keep above /:orderId
router.get("/:orderId", getInvoice);

module.exports = router;
