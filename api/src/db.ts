import Database, { type Database as DBType } from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Construct a DB connection and ensure schema exists.
 *
 * @param dbPath Path to the SQLite database file. Pass ":memory:" for an
 *               in-memory database (used by the test suite).
 */
export function createDb(dbPath: string = './data/diary.db'): DBType {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (dir && dir !== '.' && dir !== '/') {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('expense','income')),
      amount REAL NOT NULL CHECK(amount > 0),
      category TEXT NOT NULL CHECK(category IN ('Food','Transport','Salary','Entertainment','Utilities','Healthcare','Others')),
      date TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
  `);

  return db;
}

/**
 * Reset the transactions table to empty and reset the autoincrement sequence
 * so tests can rely on predictable IDs.
 */
export function resetDb(db: DBType): void {
  db.exec("DELETE FROM transactions; DELETE FROM sqlite_sequence WHERE name = 'transactions';");
}
