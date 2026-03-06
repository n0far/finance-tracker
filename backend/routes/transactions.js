const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { transactionSchema } = require('../schemas/transaction.schema');

const router = express.Router();
router.use(authMiddleware);

const getTransaction = db.prepare(
  `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
   FROM transactions t JOIN categories c ON t.category_id = c.id
   WHERE t.id = ? AND t.user_id = ?`
);

router.get('/', (req, res) => {
  const { type, category_id, from, to, tags, page = 1, limit = 25 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ['t.user_id = ?'];
  const params = [req.user.id];

  if (type) { where.push('t.type = ?'); params.push(type); }
  if (category_id) { where.push('t.category_id = ?'); params.push(parseInt(category_id)); }
  if (from) { where.push('t.date >= ?'); params.push(from); }
  if (to) { where.push('t.date <= ?'); params.push(to); }
  if (tags) {
    where.push(`EXISTS (SELECT 1 FROM json_each(t.tags) WHERE value = ?)`);
    params.push(tags);
  }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const countRow = db.prepare(
    `SELECT COUNT(*) as total FROM transactions t ${whereClause}`
  ).get(...params);

  const rows = db.prepare(
    `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM transactions t JOIN categories c ON t.category_id = c.id
     ${whereClause} ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  const transactions = rows.map(r => ({ ...r, tags: JSON.parse(r.tags) }));
  res.json({ transactions, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
});

router.get('/export/csv', (req, res) => {
  const { type, category_id, from, to, tags } = req.query;

  let where = ['t.user_id = ?'];
  const params = [req.user.id];

  if (type) { where.push('t.type = ?'); params.push(type); }
  if (category_id) { where.push('t.category_id = ?'); params.push(parseInt(category_id)); }
  if (from) { where.push('t.date >= ?'); params.push(from); }
  if (to) { where.push('t.date <= ?'); params.push(to); }
  if (tags) {
    where.push(`EXISTS (SELECT 1 FROM json_each(t.tags) WHERE value = ?)`);
    params.push(tags);
  }

  const whereClause = 'WHERE ' + where.join(' AND ');
  const rows = db.prepare(
    `SELECT t.date, t.type, t.amount, c.name as category, t.notes, t.tags
     FROM transactions t JOIN categories c ON t.category_id = c.id
     ${whereClause} ORDER BY t.date DESC`
  ).all(...params);

  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    ['Date', 'Type', 'Amount', 'Category', 'Notes', 'Tags'].map(escape).join(','),
    ...rows.map(r => [
      r.date, r.type, r.amount, r.category, r.notes,
      JSON.parse(r.tags).join(';')
    ].map(escape).join(','))
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(lines.join('\n'));
});

router.get('/:id', (req, res) => {
  const row = getTransaction.get(parseInt(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ transaction: { ...row, tags: JSON.parse(row.tags) } });
});

router.post('/', validate(transactionSchema), (req, res) => {
  const { type, amount, date, category_id, notes, tags, recurring_id } = req.validated;
  const info = db.prepare(
    `INSERT INTO transactions (user_id, type, amount, date, category_id, notes, tags, recurring_id)
     VALUES (@user_id, @type, @amount, @date, @category_id, @notes, @tags, @recurring_id)`
  ).run({
    user_id: req.user.id, type, amount, date, category_id,
    notes: notes || '', tags: JSON.stringify(tags || []),
    recurring_id: recurring_id || null
  });
  const row = getTransaction.get(info.lastInsertRowid, req.user.id);
  res.status(201).json({ transaction: { ...row, tags: JSON.parse(row.tags) } });
});

router.put('/:id', validate(transactionSchema), (req, res) => {
  const id = parseInt(req.params.id);
  const { type, amount, date, category_id, notes, tags } = req.validated;
  const info = db.prepare(
    `UPDATE transactions SET type=@type, amount=@amount, date=@date, category_id=@category_id,
     notes=@notes, tags=@tags, updated_at=datetime('now')
     WHERE id=@id AND user_id=@user_id`
  ).run({ id, user_id: req.user.id, type, amount, date, category_id, notes: notes || '', tags: JSON.stringify(tags || []) });
  if (info.changes === 0) return res.status(404).json({ error: 'Transaction not found' });
  const row = getTransaction.get(id, req.user.id);
  res.json({ transaction: { ...row, tags: JSON.parse(row.tags) } });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .run(parseInt(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ success: true });
});

module.exports = router;
