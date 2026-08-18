const inventory = require("../models/inventoryModel");

exports.getInventory = async (req, res) => {
  try {
    const data = await inventory.getInventory();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const data = await inventory.updateInventory(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Atomic stock decrement (used when an order is accepted). Concurrency-safe:
// the decrement happens in a single DB UPDATE, so simultaneous accepts from
// multiple admins never lose updates.
exports.decrementStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { qty } = req.body;
    const amount = Math.max(0, Number(qty) || 0);

    const data = await inventory.decrementStock(id, amount);

    if (!data) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
