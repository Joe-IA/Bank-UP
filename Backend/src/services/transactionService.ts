import { getDb, withTransaction } from '../database/database.js';
import type { TransactionRow } from '../database/types.js';
import { AppError } from '../utils/AppError.js';
import { getAccountByUserId, getAccountByNumber } from './accountService.js';

const MAX_BALANCE  = parseFloat(process.env.MAX_ACCOUNT_BALANCE ?? '1000000');
const MIN_TRANSFER = parseFloat(process.env.MIN_TRANSFER_AMOUNT  ?? '1');

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface DepositInput {
  userId: number;
  amount: number;
  description?: string;
}

export interface TransferInput {
  userId: number;
  destinationAccountNumber: string;
  amount: number;
  description?: string;
}

export interface TransactionWithAccounts extends TransactionRow {
  origin_account_number: string | null;
  destination_account_number: string | null;
}

// ── Service functions ──────────────────────────────────────────────────────────

/**
 * Deposits `amount` into the account owned by `userId`.
 * Runs inside an atomic SQL transaction.
 */
export function deposit({ userId, amount, description }: DepositInput): TransactionRow {
  if (amount <= 0) throw new AppError('Amount must be positive', 400);

  return withTransaction((db) => {
    const account = getAccountByUserId(userId);
    const newBalance = account.balance + amount;

    if (newBalance > MAX_BALANCE)
      throw new AppError(`Deposit would exceed the maximum balance of ${MAX_BALANCE}`, 400);

    db.prepare("UPDATE accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newBalance, account.id);

    const result = db
      .prepare(
        "INSERT INTO transactions (type, amount, destination_account_id, description) VALUES ('deposit', ?, ?, ?)"
      )
      .run(amount, account.id, description ?? null);

    return db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(result.lastInsertRowid) as unknown as TransactionRow;
  });
}

/**
 * Transfers `amount` from the account owned by `userId` to `destinationAccountNumber`.
 * Runs inside an atomic SQL transaction.
 */
export function transfer({
  userId,
  destinationAccountNumber,
  amount,
  description,
}: TransferInput): TransactionRow {
  if (amount < MIN_TRANSFER)
    throw new AppError(`Transfer amount must be at least ${MIN_TRANSFER}`, 400);

  return withTransaction((db) => {
    const origin      = getAccountByUserId(userId);
    const destination = getAccountByNumber(destinationAccountNumber);

    if (origin.id === destination.id)
      throw new AppError('Cannot transfer to your own account', 400);

    if (origin.balance < amount)
      throw new AppError('Insufficient funds', 400);

    const newOriginBalance      = origin.balance - amount;
    const newDestinationBalance = destination.balance + amount;

    if (newDestinationBalance > MAX_BALANCE)
      throw new AppError(
        `Transfer would cause destination to exceed max balance of ${MAX_BALANCE}`,
        400
      );

    db.prepare("UPDATE accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newOriginBalance, origin.id);
    db.prepare("UPDATE accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newDestinationBalance, destination.id);

    const result = db
      .prepare(
        "INSERT INTO transactions (type, amount, origin_account_id, destination_account_id, description) VALUES ('transfer', ?, ?, ?, ?)"
      )
      .run(amount, origin.id, destination.id, description ?? null);

    return db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(result.lastInsertRowid) as unknown as TransactionRow;
  });
}

/** Returns all transactions for the account owned by `userId`. */
export function getTransactionHistory(userId: number): TransactionWithAccounts[] {
  const db = getDb();
  const account = getAccountByUserId(userId);
  return db
    .prepare(
      `SELECT t.*,
              oa.account_number AS origin_account_number,
              da.account_number AS destination_account_number
       FROM transactions t
       LEFT JOIN accounts oa ON oa.id = t.origin_account_id
       LEFT JOIN accounts da ON da.id = t.destination_account_id
       WHERE t.origin_account_id = ? OR t.destination_account_id = ?
       ORDER BY t.created_at DESC`
    )
    .all(account.id, account.id) as unknown as TransactionWithAccounts[];
}

/** Returns all transactions in the system (admin only). */
export function getAllTransactions(): TransactionWithAccounts[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT t.*,
              oa.account_number AS origin_account_number,
              da.account_number AS destination_account_number
       FROM transactions t
       LEFT JOIN accounts oa ON oa.id = t.origin_account_id
       LEFT JOIN accounts da ON da.id = t.destination_account_id
       ORDER BY t.created_at DESC`
    )
    .all() as unknown as TransactionWithAccounts[];
}
