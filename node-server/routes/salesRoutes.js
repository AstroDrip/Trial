const express = require("express");
const router = express.Router();

const controller = require("../controllers/salesController");

router.get("/summary", controller.getSalesSummary);

module.exports = router;
