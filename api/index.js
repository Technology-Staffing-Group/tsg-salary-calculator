// ============================================================
// Vercel Serverless Function — wraps the Express API
// ============================================================

const { default: app, ensureDb } = require('../server/dist/index');

module.exports = async (req, res) => {
  try { await ensureDb(); } catch (e) { console.warn('DB init skipped:', e.message); }
  return app(req, res);
};
