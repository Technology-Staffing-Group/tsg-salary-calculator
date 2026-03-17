import { Router, Request, Response } from 'express';
import { logActivity } from '../services/database';

const router = Router();

// POST /api/activity/log — called by frontend on PDF export
router.post('/log', (req: Request, res: Response) => {
  const { action, detail } = req.body;
  if (!action) {
    return res.status(400).json({ success: false, error: 'Action is required.' });
  }
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  logActivity(null, 'anonymous', String(action), detail ? String(detail) : undefined, ip);
  return res.json({ success: true, data: null });
});

export default router;
