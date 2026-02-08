import { z } from 'zod';

export const CreateDataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  content: z.string().min(1, 'Content is required'),
  price: z.number().positive('Price must be positive'),
  oldPrice: z.number().positive('Old price must be positive').nullable().optional(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  image: z.string().optional().default('/images/placeholder.jpg'),
  categoryId: z.string().min(1, 'Category is required'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  
  // Carousel settings
  showInCarousel: z.boolean().optional(),
  carouselOrder: z.number().int().min(0).optional(),
  
  // Advanced product fields
  isPerishable: z.boolean().optional(),
  expirationDate: z.string().nullable().optional(),
  productionDate: z.string().nullable().optional(),
  requiresAdvanceOrder: z.boolean().optional(),
  advanceOrderDays: z.number().int().min(0).optional(),
  deliveryTimeHours: z.number().int().min(0).nullable().optional(),
  deliveryTimeDays: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  unitType: z.string().optional(),
  unitName: z.string().optional(),
  priceType: z.string().optional(), // "fixed" or "per_unit"
  availableQuantities: z.array(z.number()).optional(),
  allowFractional: z.boolean().optional(),
  minQuantity: z.number().optional(),
  quantityStep: z.number().optional(),
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
