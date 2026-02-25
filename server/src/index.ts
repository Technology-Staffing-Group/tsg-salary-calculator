// ============================================================
// TSG Salary & Cost Calculator - Express Server
// ============================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/api';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Serve static files from React build in production
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 TSG Calculator API running on http://0.0.0.0:${PORT}`);
  console.log(`📊 API endpoints available at http://0.0.0.0:${PORT}/api`);
  console.log(`❤️  Health check: http://0.0.0.0:${PORT}/api/health`);
});

export default app;
