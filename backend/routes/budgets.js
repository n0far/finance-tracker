const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { budgetSchema } = require('../schemas/budget.schema');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const budgets = db.prepare(`
    SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
      COALESCE((
        SELECT SUM(t.amount) FROM transactions t
        WHERE t.user_id = b.user_id AND t.category_id = b.category_id
          AND t.type = 'expense' AND strftime('%Y-%m', t.date) = b.month
      ), 0) as spent
    FROM budgets b JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ? AND b.month = ?
    ORDER BY c.name
  `).all(req.user.id, month);
  res.json({ budgets });
});

router.post('/', validate(budgetSchema), (req, res) => {
  const { category_id, month, limit_amount } = req.validated;
  const info = db.prepare(`
    INSERT INTO budgets (user_id, category_id, month, limit_amount)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, category_id, month) DO UPDATE SET limit_amount = excluded.limit_amount
  `).run(req.user.id, category_id, month, limit_amount);
  const budget = db.prepare(`
    SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
      COALESCE((
        SELECT SUM(t.amount) FROM transactions t
        WHERE t.user_id = b.user_id AND t.category_id = b.category_id
          AND t.type = 'expense' AND strftime('%Y-%m', t.date) = b.month
      ), 0) as spent
    FROM budgets b JOIN categories c ON b.category_id = c.id
    WHERE b.id = ?
  `).get(info.lastInsertRowid || db.prepare('SELECT id FROM budgets WHERE user_id=? AND category_id=? AND month=?').get(req.user.id, category_id, month).id);
  res.status(201).json({ budget });
});

router.put('/:id', (req, res) => {
  const { limit_amount } = req.body;
  if (!limit_amount || limit_amount <= 0) return res.status(400).json({ error: 'Invalid limit_amount' });
  const info = db.prepare('UPDATE budgets SET limit_amount = ? WHERE id = ? AND user_id = ?')
    .run(limit_amount, parseInt(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Budget not found' });
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?')
    .run(parseInt(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Budget not found' });
  res.json({ success: true });
});

module.exports = router;
