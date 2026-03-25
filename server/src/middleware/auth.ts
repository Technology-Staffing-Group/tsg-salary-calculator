// ============================================================
// Simple session auth middleware
// Validates a JWT signed with APP_SESSION_SECRET
// ============================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Auth not configured on server (APP_SESSION_SECRET missing).' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.slice(7);
  try {
    jwt.verify(token, secret);
    next();
  } catch (e: any) {
    const msg = e.name === 'TokenExpiredError'
      ? 'Session expired. Please sign in again.'
      : 'Invalid token.';
    return res.status(401).json({ success: false, error: msg });
  }
}
