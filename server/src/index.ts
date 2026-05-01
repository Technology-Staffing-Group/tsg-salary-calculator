// ============================================================
// TSG Salary & Cost Calculator - Express Server
// ============================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/api';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
// NOTE: authentication has moved to the frontend (Firebase Auth).
// The `requireAuth` middleware in middleware/auth.ts is kept in
// place for the future Microsoft Entra ID rollout but is not
// applied to the router during the Firebase migration.
app.use('/api', apiRoutes);

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON in request body.' });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ success: false, error: err.message || 'Internal server error.' });
});

// Static file serving and SPA fallback — only when running standalone (not on Vercel)
if (!process.env.VERCEL) {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 TSG Calculator API running on http://0.0.0.0:${PORT}`);
    console.log(`📊 API endpoints available at http://0.0.0.0:${PORT}/api`);
    console.log(`❤️  Health check: http://0.0.0.0:${PORT}/api/health`);
  });
}

export default app;
