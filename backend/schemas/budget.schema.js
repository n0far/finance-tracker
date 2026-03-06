const { z } = require('zod');

const budgetSchema = z.object({
  category_id: z.number().int().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  limit_amount: z.number().positive(),
});

module.exports = { budgetSchema };
