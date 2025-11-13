import { z } from 'zod';

export const CreateDataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  content: z.string().min(1, 'Content is required'),
  price: z.number().positive('Price must be positive'),
  oldPrice: z.number().positive('Old price must be positive').optional(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  image: z.string().min(1, 'Image is required'),
  categoryId: z.string().min(1, 'Category is required'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export const UpdateDataSchema = CreateDataSchema.partial();

export const QueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export type CreateDataInput = z.infer<typeof CreateDataSchema>;
export type UpdateDataInput = z.infer<typeof UpdateDataSchema>;
export type QueryParams = z.infer<typeof QueryParamsSchema>;
