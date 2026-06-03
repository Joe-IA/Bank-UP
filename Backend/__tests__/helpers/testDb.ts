import { closeDb, initializeSchema, getDb } from '../../src/database/database.js';
import { signToken } from '../../src/utils/jwt.js';
import bcrypt from 'bcryptjs';

export interface TestUser {
  id: number;
  email: string;
  role: 'user' | 'admin';
  token: string;
  accountNumber: string | null;
}

export function resetDb(): void {
  closeDb();
  initializeSchema();
}

export function createUser(
  name: string,
  email: string,
  password: string,
  role: 'user' | 'admin',
  balance = 0
): TestUser {
  const db = getDb();
  const hash = bcrypt.hashSync(password, 1);

  const userResult = db
    .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hash, role);
  const userId = userResult.lastInsertRowid as number;

  let accountNumber: string | null = null;

  if (role === 'user') {
    accountNumber = `ACC-T${String(userId).padStart(5, '0')}`;
    db.prepare('INSERT INTO accounts (user_id, account_number, balance) VALUES (?, ?, ?)')
      .run(userId, accountNumber, balance);
  }

  const token = signToken({ id: userId, email, role });

  return { id: userId, email, role, token, accountNumber };
}

export function setBalance(accountNumber: string, balance: number): void {
  getDb()
    .prepare("UPDATE accounts SET balance = ? WHERE account_number = ?")
    .run(balance, accountNumber);
}

export function getBalance(accountNumber: string): number {
  const row = getDb()
    .prepare('SELECT balance FROM accounts WHERE account_number = ?')
    .get(accountNumber) as { balance: number } | undefined;
  return row?.balance ?? 0;
}

export function insertTransferToday(originAccountId: number, amount: number): void {
  const db = getDb();
  const destAccount = db.prepare('SELECT id FROM accounts LIMIT 1').get() as { id: number };
  db.prepare(
    "INSERT INTO transactions (type, amount, origin_account_id, destination_account_id) VALUES ('transfer', ?, ?, ?)"
  ).run(amount, originAccountId, destAccount.id);
}

export function getAccountId(accountNumber: string): number {
  const row = getDb()
    .prepare('SELECT id FROM accounts WHERE account_number = ?')
    .get(accountNumber) as { id: number } | undefined;
  if (!row) throw new Error(`Account not found: ${accountNumber}`);
  return row.id;
}
