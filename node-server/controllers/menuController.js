const menuModel = require("../models/menuModel");

exports.getMenu = async (req, res) => {
  try {
    const menu = await menuModel.getMenu();

    res.json({
      success: true,
      data: menu
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to load menu"
    });
  }
};