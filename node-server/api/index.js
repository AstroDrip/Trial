// Vercel serverless function entry point.
// Deploys the full Express app (routes + CORS) as a single serverless function
// handling all /api routes. All config lives in ../app.js so there's exactly
// ONE place to update allowed CORS origins.
const app = require("../app");

module.exports = app;
