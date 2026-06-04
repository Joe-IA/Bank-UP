import { getDb } from '../database/database.js';
import type { AccountRow, UserProfile } from '../database/types.js';
import { AppError } from '../utils/AppError.js';

/** AccountRow enriquecido con el nombre y email del propietario (uso admin). */
export interface AccountWithOwner extends AccountRow {
  owner_name: string;
  owner_email: string;
}

/**
 * Obtiene la cuenta bancaria asociada a un usuario.
 * @throws AppError 404 si el usuario no tiene cuenta (p. ej. admins).
 */
export function getAccountByUserId(userId: number): AccountRow {
  const db = getDb();
  const account = db
    .prepare('SELECT * FROM accounts WHERE user_id = ?')
    .get(userId) as AccountRow | undefined;
  if (!account) throw new AppError('Account not found', 404);
  return account;
}

/**
 * Obtiene una cuenta por su número (p. ej. "ACC-000002").
 * @throws AppError 404 si el número no existe.
 */
export function getAccountByNumber(accountNumber: string): AccountRow {
  const db = getDb();
  const account = db
    .prepare('SELECT * FROM accounts WHERE account_number = ?')
    .get(accountNumber) as AccountRow | undefined;
  if (!account) throw new AppError('Destination account not found', 404);
  return account;
}

/**
 * Obtiene una cuenta por su ID interno.
 * @throws AppError 404 si no existe.
 */
export function getAccountById(accountId: number): AccountRow {
  const db = getDb();
  const account = db
    .prepare('SELECT * FROM accounts WHERE id = ?')
    .get(accountId) as AccountRow | undefined;
  if (!account) throw new AppError('Account not found', 404);
  return account;
}

/** Devuelve todas las cuentas del sistema junto con los datos de su propietario. */
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

/**
 * Devuelve el perfil público del usuario autenticado incluyendo
 * número de cuenta y saldo. Los admins tendrán account_number y balance en null.
 */
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