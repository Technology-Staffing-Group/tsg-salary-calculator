// ============================================================
// Vercel Serverless Function — wraps the Express API
// ============================================================
// Vercel natively supports Express apps exported from api/ files.
// The Express app handles routing under /api/* via the rewrites
// defined in vercel.json.
// ============================================================

const app = require('../server/dist/index').default;

module.exports = app;
