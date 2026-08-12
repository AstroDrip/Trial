const express = require("express");
const router = express.Router();

const controller = require("../controllers/orderController");

router.get("/", controller.getOrders);
router.post("/", controller.createOrder);
router.get("/archived", controller.getArchivedOrders);
router.post("/archive", controller.archiveOrders);
router.delete("/paid-synced", controller.deletePaidSyncedOrders); // keep above /:id
router.put("/:id/status", controller.updateOrderStatus);
router.put("/:id/payment", controller.updatePaymentStatus);
router.delete("/:id", controller.deleteOrder);

module.exports = router;
