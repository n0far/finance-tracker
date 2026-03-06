const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'finance.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    color      TEXT    NOT NULL DEFAULT '#6366f1',
    icon       TEXT    NOT NULL DEFAULT '📦',
    is_default INTEGER NOT NULL DEFAULT 0,
    type       TEXT    NOT NULL DEFAULT 'both',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recurring_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL,
    amount      REAL    NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    notes       TEXT    NOT NULL DEFAULT '',
    tags        TEXT    NOT NULL DEFAULT '[]',
    frequency   TEXT    NOT NULL,
    start_date  TEXT    NOT NULL,
    next_date   TEXT    NOT NULL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         TEXT    NOT NULL,
    amount       REAL    NOT NULL,
    date         TEXT    NOT NULL,
    category_id  INTEGER NOT NULL REFERENCES categories(id),
    notes        TEXT    NOT NULL DEFAULT '',
    tags         TEXT    NOT NULL DEFAULT '[]',
    recurring_id INTEGER REFERENCES recurring_rules(id) ON DELETE SET NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month        TEXT    NOT NULL,
    limit_amount REAL    NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, category_id, month)
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT    NOT NULL,
    target_amount  REAL    NOT NULL,
    current_amount REAL    NOT NULL DEFAULT 0,
    target_date    TEXT,
    color          TEXT    NOT NULL DEFAULT '#10b981',
    icon           TEXT    NOT NULL DEFAULT '🎯',
    is_completed   INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_transactions_user_category
    ON transactions(user_id, category_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_user_month
    ON budgets(user_id, month);
  CREATE INDEX IF NOT EXISTS idx_recurring_next
    ON recurring_rules(next_date, is_active);
`);

// ─── Default categories seeded per user ──────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: 'Salary',       icon: '💼', color: '#10b981', type: 'income' },
  { name: 'Freelance',    icon: '💻', color: '#06b6d4', type: 'income' },
  { name: 'Investment',   icon: '📈', color: '#8b5cf6', type: 'income' },
  { name: 'Other Income', icon: '💰', color: '#84cc16', type: 'income' },
  { name: 'Housing',      icon: '🏠', color: '#f59e0b', type: 'expense' },
  { name: 'Food & Dining',icon: '🍽️', color: '#ef4444', type: 'expense' },
  { name: 'Transport',    icon: '🚗', color: '#3b82f6', type: 'expense' },
  { name: 'Utilities',    icon: '⚡', color: '#f97316', type: 'expense' },
  { name: 'Healthcare',   icon: '🏥', color: '#ec4899', type: 'expense' },
  { name: 'Entertainment',icon: '🎮', color: '#a78bfa', type: 'expense' },
  { name: 'Shopping',     icon: '🛍️', color: '#fb923c', type: 'expense' },
  { name: 'Education',    icon: '📚', color: '#22d3ee', type: 'expense' },
  { name: 'Travel',       icon: '✈️', color: '#14b8a6', type: 'expense' },
  { name: 'Subscriptions',icon: '📱', color: '#6366f1', type: 'expense' },
  { name: 'Savings',      icon: '🏦', color: '#10b981', type: 'both' },
  { name: 'Miscellaneous',icon: '📦', color: '#9ca3af', type: 'both' },
];

const insertCategory = db.prepare(
  `INSERT INTO categories (user_id, name, icon, color, type, is_default)
   VALUES (@user_id, @name, @icon, @color, @type, 1)`
);

const seedCategories = db.transaction((userId) => {
  for (const cat of DEFAULT_CATEGORIES) {
    insertCategory.run({ user_id: userId, ...cat });
  }
});

module.exports = { db, seedCategories };
