import { getDb } from '../database/database.js';
import type { AccountRow, UserProfile } from '../database/types.js';
import { AppError } from '../utils/AppError.js';

export interface AccountWithOwner extends AccountRow {
  owner_name: string;
  owner_email: string;
}

export function getAccountByUserId(userId: number): AccountRow {
  const db = getDb();
  const account = db
    .prepare('SELECT * FROM accounts WHERE user_id = ?')
    .get(userId) as AccountRow | undefined;
  if (!account) throw new AppError('Account not found', 404);
  return account;
}

export function getAccountByNumber(accountNumber: string): AccountRow {
  const db = getDb();
  const account = db
    .prepare('SELECT * FROM accounts WHERE account_number = ?')
    .get(accountNumber) as AccountRow | undefined;
  if (!account) throw new AppError('Destination account not found', 404);
  return account;
}

export function getAccountById(accountId: number): AccountRow {
  const db = getDb();
  const account = db
    .prepare('SELECT * FROM accounts WHERE id = ?')
    .get(accountId) as AccountRow | undefined;
  if (!account) throw new AppError('Account not found', 404);
  return account;
}

export function getAllAccounts(): AccountWithOwner[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.*, u.name AS owner_name, u.email AS owner_email
       FROM accounts a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.id`
    )
    .all() as unknown as AccountWithOwner[];
}

export function getUserProfile(userId: number): UserProfile {
  const db = getDb();

  const row = db.prepare(`
    SELECT
      u.name,
      u.email,
      u.role,
      a.account_number,
      a.balance
    FROM users u
    LEFT JOIN accounts a ON a.user_id = u.id
    WHERE u.id = ?
  `).get(userId) as UserProfile | undefined;

  if (!row) throw new AppError('User not found', 404);

  return row;
}