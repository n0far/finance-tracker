const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/summary', (req, res) => {
  const from = req.query.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to = req.query.to || new Date().toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT type, SUM(amount) as total
    FROM transactions WHERE user_id = ? AND date BETWEEN ? AND ?
    GROUP BY type
  `).all(req.user.id, from, to);

  const income = rows.find(r => r.type === 'income')?.total || 0;
  const expenses = rows.find(r => r.type === 'expense')?.total || 0;
  res.json({ income, expenses, net: income - expenses, from, to });
});

router.get('/monthly', (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
    FROM transactions
    WHERE user_id = ? AND date >= date('now', '-12 months')
    GROUP BY month, type
    ORDER BY month ASC
  `).all(req.user.id);

  const monthMap = {};
  for (const row of rows) {
    if (!monthMap[row.month]) monthMap[row.month] = { month: row.month, income: 0, expenses: 0 };
    if (row.type === 'income') monthMap[row.month].income = row.total;
    if (row.type === 'expense') monthMap[row.month].expenses = row.total;
  }

  res.json({ monthly: Object.values(monthMap) });
});

router.get('/by-category', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const rows = db.prepare(`
    SELECT c.id, c.name, c.color, c.icon, SUM(t.amount) as total
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.date) = ?
    GROUP BY c.id ORDER BY total DESC
  `).all(req.user.id, month);
  res.json({ categories: rows });
});

router.get('/savings-curve', (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
    FROM transactions WHERE user_id = ?
    GROUP BY month, type ORDER BY month ASC
  `).all(req.user.id);

  const monthMap = {};
  for (const row of rows) {
    if (!monthMap[row.month]) monthMap[row.month] = { month: row.month, income: 0, expenses: 0 };
    if (row.type === 'income') monthMap[row.month].income = row.total;
    if (row.type === 'expense') monthMap[row.month].expenses = row.total;
  }

  let cumulative = 0;
  const curve = Object.values(monthMap).map(m => {
    cumulative += m.income - m.expenses;
    return { month: m.month, savings: cumulative };
  });

  res.json({ curve });
});

router.get('/health-score', (req, res) => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Current month income/expenses
  const monthRows = db.prepare(`
    SELECT type, SUM(amount) as total FROM transactions
    WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    GROUP BY type
  `).all(req.user.id, currentMonth);

  const income = monthRows.find(r => r.type === 'income')?.total || 0;
  const expenses = monthRows.find(r => r.type === 'expense')?.total || 0;
  const net = income - expenses;

  const savingsRate = income > 0 ? Math.min((net / income) * 100, 100) : 0;

  // Budget adherence
  const budgets = db.prepare(`
    SELECT b.limit_amount,
      COALESCE((
        SELECT SUM(t.amount) FROM transactions t
        WHERE t.user_id = b.user_id AND t.category_id = b.category_id
          AND t.type = 'expense' AND strftime('%Y-%m', t.date) = b.month
      ), 0) as spent
    FROM budgets b WHERE b.user_id = ? AND b.month = ?
  `).all(req.user.id, currentMonth);

  const budgetAdherence = budgets.length > 0
    ? (budgets.filter(b => b.spent <= b.limit_amount).length / budgets.length) * 100
    : 100;

  // Consistency: months with positive savings in last 6 months
  const recentMonths = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
    FROM transactions WHERE user_id = ? AND date >= date('now', '-6 months')
    GROUP BY month, type
  `).all(req.user.id);

  const monthMap2 = {};
  for (const r of recentMonths) {
    if (!monthMap2[r.month]) monthMap2[r.month] = { income: 0, expenses: 0 };
    if (r.type === 'income') monthMap2[r.month].income = r.total;
    if (r.type === 'expense') monthMap2[r.month].expenses = r.total;
  }
  const positiveMonths = Object.values(monthMap2).filter(m => m.income - m.expenses > 0).length;
  const consistencyBonus = positiveMonths >= 3 ? 30 : (positiveMonths / 3) * 30;

  const score = Math.round(savingsRate * 0.4 + budgetAdherence * 0.3 + consistencyBonus);

  res.json({
    score: Math.min(score, 100),
    savingsRate: Math.round(savingsRate),
    budgetAdherence: Math.round(budgetAdherence),
    consistencyBonus: Math.round(consistencyBonus),
    income, expenses, net
  });
});

module.exports = router;
