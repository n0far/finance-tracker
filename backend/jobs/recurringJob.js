const { processRecurring } = require('../routes/recurring');

// Run every hour to create due recurring transactions for all users
function startRecurringJob() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  function run() {
    try {
      const count = processRecurring(null); // null = all users
      if (count > 0) console.log(`[recurring] Created ${count} transaction(s) from recurring rules`);
    } catch (err) {
      console.error('[recurring] Error processing recurring rules:', err.message);
    }
  }

  run(); // run immediately on startup
  setInterval(run, INTERVAL_MS);
}

module.exports = { startRecurringJob };
