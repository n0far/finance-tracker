const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { recurringSchema } = require('../schemas/recurring.schema');

const router = express.Router();
router.use(authMiddleware);

const getRule = (id, userId) => db.prepare(
  `SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
   FROM recurring_rules r JOIN categories c ON r.category_id = c.id
   WHERE r.id = ? AND r.user_id = ?`
).get(id, userId);

function formatRow(r) {
  return r ? { ...r, tags: JSON.parse(r.tags || '[]') } : null;
}

router.get('/', (req, res) => {
  const rules = db.prepare(
    `SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM recurring_rules r JOIN categories c ON r.category_id = c.id
     WHERE r.user_id = ? ORDER BY r.next_date ASC`
  ).all(req.user.id).map(formatRow);
  res.json({ rules });
});

router.post('/', validate(recurringSchema), (req, res) => {
  const { type, amount, category_id, notes, tags, frequency, start_date } = req.validated;
  const info = db.prepare(`
    INSERT INTO recurring_rules (user_id, type, amount, category_id, notes, tags, frequency, start_date, next_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, type, amount, category_id, notes || '', JSON.stringify(tags || []), frequency, start_date, start_date);
  res.status(201).json({ rule: formatRow(getRule(info.lastInsertRowid, req.user.id)) });
});

router.put('/:id', validate(recurringSchema), (req, res) => {
  const id = parseInt(req.params.id);
  const { type, amount, category_id, notes, tags, frequency, start_date } = req.validated;
  const info = db.prepare(`
    UPDATE recurring_rules SET type=?, amount=?, category_id=?, notes=?, tags=?, frequency=?, start_date=?
    WHERE id=? AND user_id=?
  `).run(type, amount, category_id, notes || '', JSON.stringify(tags || []), frequency, start_date, id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Rule not found' });
  res.json({ rule: formatRow(getRule(id, req.user.id)) });
});

router.patch('/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id);
  const rule = db.prepare('SELECT * FROM recurring_rules WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  db.prepare('UPDATE recurring_rules SET is_active = ? WHERE id = ?').run(rule.is_active ? 0 : 1, id);
  res.json({ rule: formatRow(getRule(id, req.user.id)) });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM recurring_rules WHERE id = ? AND user_id = ?')
    .run(parseInt(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Rule not found' });
  res.json({ success: true });
});

// Manual trigger (also called by the recurring job)
router.post('/process', (req, res) => {
  const count = processRecurring(req.user.id);
  res.json({ processed: count });
});

function processRecurring(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const dueRules = db.prepare(
    `SELECT * FROM recurring_rules WHERE next_date <= ? AND is_active = 1 ${userId ? 'AND user_id = ?' : ''}`
  ).all(userId ? [today, userId] : [today]);

  const insertTx = db.prepare(`
    INSERT INTO transactions (user_id, type, amount, date, category_id, notes, tags, recurring_id)
    VALUES (@user_id, @type, @amount, @date, @category_id, @notes, @tags, @id)
  `);
  const advanceDate = db.prepare(`
    UPDATE recurring_rules SET next_date = ? WHERE id = ?
  `);

  const process = db.transaction((rules) => {
    let count = 0;
    for (const rule of rules) {
      insertTx.run({
        user_id: rule.user_id, type: rule.type, amount: rule.amount,
        date: rule.next_date, category_id: rule.category_id,
        notes: rule.notes, tags: rule.tags, id: rule.id
      });

      const d = new Date(rule.next_date);
      if (rule.frequency === 'weekly') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      advanceDate.run(d.toISOString().slice(0, 10), rule.id);
      count++;
    }
    return count;
  });

  return process(dueRules);
}

module.exports = router;
module.exports.processRecurring = processRecurring;
