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