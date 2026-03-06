require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin.toLowerCase())) {
      return callback(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/savings-goals', require('./routes/savingsGoals'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Finance Tracker API running on http://localhost:${PORT}`);
  // Start recurring job after server is up
  require('./jobs/recurringJob').startRecurringJob();
});
