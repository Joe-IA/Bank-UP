import { DatabaseSync } from "node:sqlite";
import { logger } from "../log/logger.js";

/**
 * Instancia singleton de la base de datos SQLite.
 * Se inicializa la primera vez que se llama a getDb().
 */
let db: DatabaseSync | null = null;

/**
 * Devuelve la conexión singleton a la base de datos.
 * En la primera llamada abre el archivo indicado por DB_PATH y activa
 * WAL mode (mejor concurrencia de lectura) y foreign keys.
 */
export function getDb(): DatabaseSync {
    if(!db){
        const dbPath = process.env.DB_PATH!;
        db = new DatabaseSync(dbPath);
        db.exec("PRAGMA journal_mode = WAL;");
        db.exec("PRAGMA foreign_keys = ON;");
    }
    return db;
}

/**
 * Cierra la conexión a la base de datos y limpia el singleton.
 * Útil en los tests para aislar cada suite en su propia BD.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Ejecuta `fn` dentro de una transacción SQL atómica.
 * Si `fn` lanza, hace ROLLBACK y re-lanza el error.
 */
export function withTransaction<T>(fn: (db:DatabaseSync) => T): T {
    const database = getDb();
    database.exec("BEGIN");
    try{
        const result = fn(database);
        database.exec("COMMIT");
        return result;
    } catch(err){
        database.exec("ROLLBACK");
        throw err;
    }
}

/**
 * Crea las tablas si no existen (idempotente).
 * Se llama una sola vez al arrancar la aplicación.
 *
 * Tablas:
 * - users          — credenciales y rol
 * - accounts       — cuenta bancaria vinculada 1-a-1 con un usuario
 * - transactions   — depósitos y transferencias
 * - login_attempts — auditoría de intentos de acceso
 */
export function initializeSchema(): DatabaseSync {
    const database = getDb();
      database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
      is_locked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      account_number TEXT NOT NULL UNIQUE,
      balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('deposit', 'transfer')),
      amount REAL NOT NULL CHECK (amount > 0),
      origin_account_id INTEGER REFERENCES accounts(id),
      destination_account_id INTEGER NOT NULL REFERENCES accounts(id),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      success INTEGER NOT NULL CHECK (success IN (0, 1)),
      ip_address TEXT,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  logger.info("[DB] Schema initialized");
  return database;

}