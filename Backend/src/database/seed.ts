import bcryptjs from 'bcryptjs';
import { getDb, initializeSchema } from "./database.js";
import { logger } from "../log/logger.js";

const SEED_USERS = [
  { name: "Admin",       email: "admin@bank.com",  password: "admin123",    role: "admin", balance: 0       },
  { name: "Alice Smith", email: "alice@bank.com",  password: "password123", role: "user",  balance: 47660.0 },
  { name: "Bob Jones",   email: "bob@bank.com",    password: "password123", role: "user",  balance: 28400.0 },
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

  const insertUser    = db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`);
  const insertAccount = db.prepare(`INSERT INTO accounts (user_id, account_number, balance) VALUES (?, ?, ?)`);

  db.exec("BEGIN");
  try {
    for (let i = 0; i < SEED_USERS.length; i++) {
      const user           = SEED_USERS[i];
      const hashedPassword = bcryptjs.hashSync(user.password, 12);
      insertUser.run(user.name, user.email, hashedPassword, user.role);
      const row = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };
      insertAccount.run(row.id, generateAccountNumber(i + 1), user.balance);
      logger.info(`[DB] Created ${user.role}: ${user.email} / ${user.password}`);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    logger.error(`[DB] Seeding users failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }

  // ── Account IDs: Admin=1, Alice=2, Bob=3 ──────────────────────────────────
  // Transactions are inserted with explicit created_at to simulate ~6 weeks of
  // activity. Balances above were calculated to match the sum of these inserts.

  logger.info("[DB] Seeding transactions...");

  const insertTx = db.prepare(`
    INSERT INTO transactions (type, amount, origin_account_id, destination_account_id, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const txs: [string, number, number | null, number, string, string][] = [
    // ── Semana 1 (hace ~45 días) ────────────────────────────────────────────
    ["deposit",  18420, null, 2, "Nómina UP · Abril",                   "datetime('now','-45 days','+8 hours')"],
    ["deposit",   8500, null, 3, "Nómina UP · Abril",                   "datetime('now','-40 days','+8 hours','+30 minutes')"],
    ["transfer",  1500,    2, 3, "Renta departamento · abril",          "datetime('now','-38 days','+14 hours','+20 minutes')"],
    ["deposit",    650, null, 2, "Reembolso Atzin Cruz",                "datetime('now','-35 days','+10 hours','+15 minutes')"],

    // ── Semana 2 (hace ~30 días) ────────────────────────────────────────────
    ["transfer",   300,    3, 2, "Reembolso comida grupo",              "datetime('now','-32 days','+12 hours')"],
    ["transfer",  2000,    2, 3, "Préstamo personal · Bob",             "datetime('now','-30 days','+16 hours','+30 minutes')"],
    ["deposit",    500, null, 3, "Depósito en efectivo",                "datetime('now','-28 days','+9 hours')"],
    ["transfer",  2000,    3, 2, "Devolución préstamo",                 "datetime('now','-25 days','+11 hours')"],

    // ── Semana 3 (hace ~22 días) ────────────────────────────────────────────
    ["deposit",  18420, null, 2, "Nómina UP · Mayo",                    "datetime('now','-22 days','+8 hours')"],
    ["transfer",  1500,    2, 3, "Renta departamento · mayo",           "datetime('now','-20 days','+15 hours','+30 minutes')"],
    ["deposit",   8500, null, 3, "Nómina UP · Mayo",                    "datetime('now','-18 days','+8 hours')"],

    // ── Semana 4 (hace ~15 días) ────────────────────────────────────────────
    ["transfer",  4200,    2, 3, "Pago tarjeta de crédito",             "datetime('now','-15 days','+9 hours','+41 minutes')"],
    ["deposit",   2000, null, 2, "Depósito en efectivo",                "datetime('now','-12 days','+14 hours','+2 minutes')"],
    ["transfer",   800,    3, 2, "Reembolso Atzin Cruz",                "datetime('now','-10 days','+19 hours','+22 minutes')"],
    ["transfer",  3500,    2, 3, "Mensualidad colegiatura UP",          "datetime('now','-8 days','+11 hours','+15 minutes')"],

    // ── Semana 5 (hace ~5 días) ─────────────────────────────────────────────
    ["deposit",    650, null, 2, "Bono desempeño Q2",                   "datetime('now','-5 days','+14 hours','+10 minutes')"],
    ["transfer",   500,    3, 2, "Reembolso gasolina",                  "datetime('now','-3 days','+20 hours','+5 minutes')"],

    // ── Esta semana ─────────────────────────────────────────────────────────
    ["deposit",  18420, null, 2, "Nómina UP · Junio",                   "datetime('now','-1 days','+8 hours')"],
    ["transfer",  1800,    2, 3, "Pago servicios · junio",              "datetime('now','-1 days','+18 hours','+50 minutes')"],
  ];

  db.exec("BEGIN");
  try {
    for (const [type, amount, origin, dest, desc, dateExpr] of txs) {
      db.exec(
        `INSERT INTO transactions (type, amount, origin_account_id, destination_account_id, description, created_at)
         VALUES ('${type}', ${amount}, ${origin ?? "NULL"}, ${dest}, '${desc}', ${dateExpr})`
      );
    }
    db.exec("COMMIT");
    logger.info(`[DB] Seeded ${txs.length} transactions`);
  } catch (err) {
    db.exec("ROLLBACK");
    logger.error(`[DB] Seeding transactions failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }

  logger.info("[DB] Seeding complete");
}
