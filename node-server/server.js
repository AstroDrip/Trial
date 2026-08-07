// Local development server. On Vercel, the serverless function at
// /api/index.js handles requests instead (see api/index.js).
require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
