import { getDb } from '../database/database.js';
import type { UserRow, LoginAttemptRow } from '../database/types.js';
import { AppError } from '../utils/AppError.js';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  is_locked: number;
  created_at: string;
}

export interface LoginAttemptWithUser extends LoginAttemptRow {
  user_name: string | null;
}

export function getAllUsers(): PublicUser[] {
  const db = getDb();
  return db
    .prepare('SELECT id, name, email, role, is_locked, created_at FROM users ORDER BY id')
    .all() as unknown as PublicUser[];
}

export function getUserById(userId: number): PublicUser {
  const db = getDb();
  const user = db
    .prepare('SELECT id, name, email, role, is_locked, created_at FROM users WHERE id = ?')
    .get(userId) as PublicUser | undefined;
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export function lockUser(userId: number): { message: string } {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) throw new AppError('User not found', 404);
  db.prepare("UPDATE users SET is_locked = 1, updated_at = datetime('now') WHERE id = ?").run(userId);
  return { message: 'User locked successfully' };
}

export function unlockUser(userId: number): { message: string } {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) throw new AppError('User not found', 404);
  db.prepare("UPDATE users SET is_locked = 0, updated_at = datetime('now') WHERE id = ?").run(userId);
  return { message: 'User unlocked successfully' };
}

export function getLoginAttempts(userId: number): LoginAttemptRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM login_attempts
       WHERE user_id = ?
       ORDER BY attempted_at DESC
       LIMIT 100`
    )
    .all(userId) as unknown as LoginAttemptRow[];
}

export function getAllLoginAttempts(): LoginAttemptWithUser[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT la.*, u.name AS user_name
       FROM login_attempts la
       LEFT JOIN users u ON u.id = la.user_id
       ORDER BY la.attempted_at DESC
       LIMIT 200`
    )
    .all() as unknown as LoginAttemptWithUser[];
}
