const express = require("express");
const router = express.Router();

const controller = require("../controllers/inventoryController");

router.get("/", controller.getInventory);

router.put("/:id", controller.updateInventory);

module.exports = router;