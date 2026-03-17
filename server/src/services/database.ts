// ============================================================
// TSG Salary Calculator - SQLite Database Service
// ============================================================

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'users.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT,
    ip_address TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed default admin on first run
const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(
    'INSERT INTO users (username, password_hash, full_name, is_admin, must_change_password) VALUES (?, ?, ?, 1, 1)'
  ).run('admin', hash, 'Administrator');
  console.log('✅ Default admin user created — username: admin  password: admin123');
}

// ---- Types ----

export interface User {
  id: number;
  username: string;
  full_name: string;
  is_admin: number;
  must_change_password: number;
  created_at: string;
}

export interface ActivityEntry {
  id: number;
  user_id: number | null;
  full_name: string;
  action: string;
  detail: string | null;
  ip_address: string | null;
  timestamp: string;
}

// ---- User helpers ----

export function getUserByUsername(username: string): (User & { password_hash: string }) | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
}

export function getUserById(id: number): User | undefined {
  return db
    .prepare('SELECT id, username, full_name, is_admin, must_change_password, created_at FROM users WHERE id = ?')
    .get(id) as any;
}

export function getAllUsers(): User[] {
  return db
    .prepare('SELECT id, username, full_name, is_admin, must_change_password, created_at FROM users ORDER BY created_at ASC')
    .all() as User[];
}

export function createUser(username: string, tempPassword: string, fullName: string, isAdmin: boolean): User {
  const hash = bcrypt.hashSync(tempPassword, 10);
  const result = db
    .prepare('INSERT INTO users (username, password_hash, full_name, is_admin, must_change_password) VALUES (?, ?, ?, ?, 1)')
    .run(username, hash, fullName, isAdmin ? 1 : 0);
  return getUserById(result.lastInsertRowid as number)!;
}

export function updateUser(id: number, updates: { full_name?: string; is_admin?: boolean }): User | undefined {
  if (updates.full_name !== undefined) {
    db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(updates.full_name, id);
  }
  if (updates.is_admin !== undefined) {
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(updates.is_admin ? 1 : 0, id);
  }
  return getUserById(id);
}

export function resetUserPassword(id: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const tempPassword = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const hash = bcrypt.hashSync(tempPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(hash, id);
  return tempPassword;
}

export function changePassword(id: number, newPassword: string): void {
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, id);
}

export function deleteUser(id: number): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

// ---- Session helpers ----

const SESSION_TTL_HOURS = 24;

export function createSession(userId: number): string {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return token;
}

export function getSessionUser(token: string): User | undefined {
  const row = db
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?')
    .get(token) as { user_id: number; expires_at: string } | undefined;
  if (!row) return undefined;
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return undefined;
  }
  return getUserById(row.user_id);
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// ---- Activity log helpers ----

export function logActivity(
  userId: number | null,
  fullName: string,
  action: string,
  detail?: string,
  ipAddress?: string
): void {
  db.prepare(
    'INSERT INTO activity_log (user_id, full_name, action, detail, ip_address) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, fullName, action, detail ?? null, ipAddress ?? null);
}

export function getActivityLog(limit = 500): ActivityEntry[] {
  return db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?').all(limit) as ActivityEntry[];
}
