const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, seedCategories } = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');

const router = express.Router();

const findUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUser = db.prepare(
  'INSERT INTO users (email, password, name) VALUES (@email, @password, @name)'
);
const findUserById = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?');

router.post('/register', validate(registerSchema), (req, res) => {
  const { email, password, name } = req.validated;
  if (findUserByEmail.get(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  const info = insertUser.run({ email, password: hashed, name });
  const userId = info.lastInsertRowid;
  seedCategories(userId);
  const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: userId, email, name } });
});

router.post('/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.validated;
  const user = findUserByEmail.get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = findUserById.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;
