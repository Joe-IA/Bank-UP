import bcrypt from 'bcryptjs';
import { getDb, withTransaction } from '../database/database.js';
import type { UserRow } from '../database/types.js';
import { signToken } from '../utils/jwt.js';
import { generateAccountNumber } from '../utils/accountNumbers.js';
import { AppError } from '../utils/AppError.js';

const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? '3', 10);

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

// ── Service functions ──────────────────────────────────────────────────────────

/**
 * Registers a new user. If role is 'user', also creates a linked account atomically.
 */
export function register({ name, email, password, role = 'user' }: RegisterInput): PublicUser {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new AppError('Email already in use', 409);

  const hash = bcrypt.hashSync(password, 12);

  const userId = withTransaction((db) => {
    const result = db
      .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
      .run(name, email, hash, role);

    const uid = result.lastInsertRowid as number;

    if (role === 'user') {
      let accountNumber: string;
      do {
        accountNumber = generateAccountNumber();
      } while (db.prepare('SELECT id FROM accounts WHERE account_number = ?').get(accountNumber));

      db.prepare('INSERT INTO accounts (user_id, account_number, balance) VALUES (?, ?, 0)')
        .run(uid, accountNumber);
    }

    return uid;
  });

  return db
    .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
    .get(userId) as unknown as PublicUser;
}

/**
 * Authenticates a user. Records every attempt (success or failure).
 * Locks the account automatically after MAX_ATTEMPTS consecutive failures.
 */
export function login({ email, password, ipAddress }: LoginInput): LoginResult {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;

  const recordAttempt = (success: boolean): void => {
    db.prepare(
      'INSERT INTO login_attempts (user_id, email, success, ip_address) VALUES (?, ?, ?, ?)'
    ).run(user?.id ?? null, email, success ? 1 : 0, ipAddress ?? null);
  };

  if (!user) {
    recordAttempt(false);
    throw new AppError('Invalid credentials', 401);
  }

  if (user.is_locked) {
    recordAttempt(false);
    throw new AppError('Account is locked. Contact an administrator.', 403);
  }

  const passwordValid = bcrypt.compareSync(password, user.password);

  if (!passwordValid) {
    recordAttempt(false);

    const { cnt } = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM login_attempts
         WHERE user_id = ? AND success = 0
           AND attempted_at >= (
             SELECT COALESCE(MAX(attempted_at), '1970-01-01')
             FROM login_attempts WHERE user_id = ? AND success = 1
           )`
      )
      .get(user.id, user.id) as { cnt: number };

    if (cnt >= MAX_ATTEMPTS) {
      db.prepare("UPDATE users SET is_locked = 1 WHERE id = ?").run(user.id);
      throw new AppError(`Account locked after ${MAX_ATTEMPTS} failed attempts.`, 403);
    }

    throw new AppError('Invalid credentials', 401);
  }

  recordAttempt(true);

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}
