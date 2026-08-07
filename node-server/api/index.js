// Vercel serverless function entry point.
// Deploys the Express app as a single serverless function handling all /api routes.
const app = require("../app");

module.exports = app;
