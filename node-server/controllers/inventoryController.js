const inventory = require("../models/inventoryModel");
const events = require("../utils/events");

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

    // Notify all connected admin dashboards in real time so price/stock/
    // availability edits made by one admin appear instantly on the others.
    if (data) {
      events.emit("inventory_updated", {
        menu_item_id: data.menu_item_id,
        stock: data.stock,
        available: data.available,
        price: data.selling_price,
      });
    }

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

    // Notify all connected admin dashboards in real time.
    events.emit("inventory_updated", { menu_item_id: id, stock: data.stock });

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
