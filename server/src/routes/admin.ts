import { Router, Request, Response } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  getUserById,
  getActivityLog,
} from '../services/database';

const router = Router();

// GET /api/admin/users
router.get('/users', (_req: Request, res: Response) => {
  res.json({ success: true, data: getAllUsers() });
});

// POST /api/admin/users — create user, return temp password
router.post('/users', (req: Request, res: Response) => {
  const { username, full_name, is_admin } = req.body;
  if (!username || !full_name) {
    return res.status(400).json({ success: false, error: 'Username and full name are required.' });
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const tempPassword = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  try {
    const user = createUser(String(username).trim(), tempPassword, String(full_name).trim(), !!is_admin);
    return res.json({ success: true, data: { user, tempPassword } });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: 'Username already exists.' });
    }
    throw err;
  }
});

// PUT /api/admin/users/:id — update name / admin flag
router.put('/users/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { full_name, is_admin } = req.body;
  const updated = updateUser(id, {
    full_name: full_name !== undefined ? String(full_name).trim() : undefined,
    is_admin: is_admin !== undefined ? !!is_admin : undefined,
  });
  if (!updated) return res.status(404).json({ success: false, error: 'User not found.' });
  return res.json({ success: true, data: updated });
});

// POST /api/admin/users/:id/reset-password — generate new temp password
router.post('/users/:id/reset-password', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!getUserById(id)) return res.status(404).json({ success: false, error: 'User not found.' });
  const tempPassword = resetUserPassword(id);
  return res.json({ success: true, data: { tempPassword } });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!getUserById(id)) return res.status(404).json({ success: false, error: 'User not found.' });
  deleteUser(id);
  return res.json({ success: true, data: null });
});

// GET /api/admin/logs
router.get('/logs', (_req: Request, res: Response) => {
  res.json({ success: true, data: getActivityLog(500) });
});

export default router;
