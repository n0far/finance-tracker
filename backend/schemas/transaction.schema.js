const { z } = require('zod');

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.number().int().positive(),
  notes: z.string().max(500).default(''),
  tags: z.array(z.string()).default([]),
  recurring_id: z.number().int().positive().nullable().optional(),
});

module.exports = { transactionSchema };
