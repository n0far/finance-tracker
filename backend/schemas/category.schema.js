const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  icon: z.string().min(1).max(10).default('📦'),
  type: z.enum(['income', 'expense', 'both']).default('both'),
});

module.exports = { categorySchema };
