// ============================================================
// Vercel Serverless Function — wraps the Express API
// ============================================================

const { default: app } = require('../server/dist/index');

module.exports = (req, res) => app(req, res);
