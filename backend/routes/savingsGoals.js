const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { savingsGoalSchema, depositSchema } = require('../schemas/savingsGoal.schema');

const router = express.Router();
router.use(authMiddleware);

const getGoal = (id, userId) => db.prepare(
  'SELECT * FROM savings_goals WHERE id = ? AND user_id = ?'
).get(id, userId);

router.get('/', (req, res) => {
  const goals = db.prepare('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ goals });
});

router.post('/', validate(savingsGoalSchema), (req, res) => {
  const { name, target_amount, current_amount, target_date, color, icon } = req.validated;
  const info = db.prepare(`
    INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date, color, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, target_amount, current_amount || 0, target_date || null, color, icon);
  res.status(201).json({ goal: getGoal(info.lastInsertRowid, req.user.id) });
});

router.put('/:id', validate(savingsGoalSchema), (req, res) => {
  const id = parseInt(req.params.id);
  const { name, target_amount, current_amount, target_date, color, icon } = req.validated;
  const is_completed = current_amount >= target_amount ? 1 : 0;
  const info = db.prepare(`
    UPDATE savings_goals SET name=?, target_amount=?, current_amount=?, target_date=?,
    color=?, icon=?, is_completed=?, updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).run(name, target_amount, current_amount || 0, target_date || null, color, icon, is_completed, id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Goal not found' });
  res.json({ goal: getGoal(id, req.user.id) });
});

router.patch('/:id/deposit', validate(depositSchema), (req, res) => {
  const id = parseInt(req.params.id);
  const goal = getGoal(id, req.user.id);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  const newAmount = goal.current_amount + req.validated.amount;
  const is_completed = newAmount >= goal.target_amount ? 1 : 0;
  db.prepare(`
    UPDATE savings_goals SET current_amount=?, is_completed=?, updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).run(newAmount, is_completed, id, req.user.id);
  res.json({ goal: getGoal(id, req.user.id) });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?')
    .run(parseInt(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Goal not found' });
  res.json({ success: true });
});

module.exports = router;
