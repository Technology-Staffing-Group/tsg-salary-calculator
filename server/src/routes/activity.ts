import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logActivity } from '../services/database';

const router = Router();

// POST /api/activity/log — called by frontend on PDF export
router.post('/log', requireAuth, (req: AuthRequest, res: Response) => {
  const { action, detail } = req.body;
  if (!action) {
    return res.status(400).json({ success: false, error: 'Action is required.' });
  }
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  logActivity(req.user!.id, req.user!.full_name, String(action), detail ? String(detail) : undefined, ip);
  return res.json({ success: true, data: null });
});

export default router;
