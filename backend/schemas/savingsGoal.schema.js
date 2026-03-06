const { z } = require('zod');

const savingsGoalSchema = z.object({
  name: z.string().min(1).max(100),
  target_amount: z.number().positive(),
  current_amount: z.number().min(0).default(0),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#10b981'),
  icon: z.string().min(1).max(10).default('🎯'),
});

const depositSchema = z.object({
  amount: z.number().positive(),
});

module.exports = { savingsGoalSchema, depositSchema };
