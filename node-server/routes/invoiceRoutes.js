const express = require("express");
const router = express.Router();
const { getInvoice, getAcceptedInvoicesZip, syncAcceptedOrdersToSheet } = require("../controllers/invoiceController");

router.get("/batch", getAcceptedInvoicesZip); // keep above /:orderId
router.post("/sync-sheet", syncAcceptedOrdersToSheet); // keep above /:orderId
router.get("/:orderId", getInvoice);

module.exports = router;
