const { z } = require('zod');

const recurringSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category_id: z.number().int().positive(),
  notes: z.string().max(500).default(''),
  tags: z.array(z.string()).default([]),
  frequency: z.enum(['weekly', 'monthly']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

module.exports = { recurringSchema };
