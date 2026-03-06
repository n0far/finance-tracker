const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { categorySchema } = require('../schemas/category.schema');

const router = express.Router();
router.use(authMiddleware);

const listCategories = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY type, name');
const getCategory = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?');
const insertCategory = db.prepare(
  'INSERT INTO categories (user_id, name, color, icon, type) VALUES (@user_id, @name, @color, @icon, @type)'
);
const updateCategory = db.prepare(
  'UPDATE categories SET name = @name, color = @color, icon = @icon, type = @type WHERE id = @id AND user_id = @user_id AND is_default = 0'
);
const deleteCategory = db.prepare(
  'DELETE FROM categories WHERE id = ? AND user_id = ? AND is_default = 0'
);

router.get('/', (req, res) => {
  const categories = listCategories.all(req.user.id);
  res.json({ categories });
});

router.post('/', validate(categorySchema), (req, res) => {
  const { name, color, icon, type } = req.validated;
  const info = insertCategory.run({ user_id: req.user.id, name, color, icon, type });
  const category = getCategory.get(info.lastInsertRowid, req.user.id);
  res.status(201).json({ category });
});

router.put('/:id', validate(categorySchema), (req, res) => {
  const id = parseInt(req.params.id);
  const { name, color, icon, type } = req.validated;
  const info = updateCategory.run({ id, user_id: req.user.id, name, color, icon, type });
  if (info.changes === 0) return res.status(404).json({ error: 'Category not found or is a default category' });
  res.json({ category: getCategory.get(id, req.user.id) });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const info = deleteCategory.run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Category not found or is a default category' });
  res.json({ success: true });
});

module.exports = router;
