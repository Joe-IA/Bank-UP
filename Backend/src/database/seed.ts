import bcryptjs from 'bcryptjs';
import { getDb, initializeSchema } from "./database.js";
import { logger } from "../log/logger.js";

const SEED_USERS = [
  { name: "Admin", email: "admin@bank.com", password: "admin123", role: "admin", balance: 10000.0 },
  { name: "Alice Smith", email: "alice@bank.com", password: "password123", role: "user", balance: 5000.0  },
  { name: "Bob Jones", email: "bob@bank.com", password: "password123", role: "user", balance: 2500.0  }
];

function generateAccountNumber(index: number): string {
  return `ACC-${String(index).padStart(6, "0")}`;
}

export function initializeDatabase(): void {
  const db = initializeSchema();

  const existingUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (existingUsers.count > 0) {
    logger.info("[DB] Seed data already exists, skipping");
    return;
  }

  logger.info("[DB] Seeding initial users...");

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `);

  const insertAccount = db.prepare(`
    INSERT INTO accounts (user_id, account_number, balance)
    VALUES (?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    for (let i = 0; i < SEED_USERS.length; i++) {
      const user = SEED_USERS[i];
      const hashedPassword = bcryptjs.hashSync(user.password, 12);

      insertUser.run(user.name, user.email, hashedPassword, user.role);
      const row = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      insertAccount.run(row.id, generateAccountNumber(i + 1), user.balance);
      logger.info(`[DB] Created ${user.role}: ${user.email} / ${user.password}`);
    }
    db.exec("COMMIT");
    logger.info("[DB] Seeding complete");
  } catch (err) {
    db.exec("ROLLBACK");
    logger.error(`[DB] Seeding failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}