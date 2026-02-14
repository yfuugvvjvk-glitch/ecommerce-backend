import { z } from 'zod';

export const CreateDataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  content: z.string().min(1, 'Content is required'),
  importantInfo: z.string().max(5000, 'Important info too long').optional(), // HTML formatat pentru informații importante
  price: z.number().positive('Price must be positive'),
  oldPrice: z.number().positive('Old price must be positive').nullable().optional(),
  stock: z.number().min(0, 'Stock cannot be negative'),
  image: z.string().min(1, 'Image is required'),
  categoryId: z.string().min(1, 'Category is required'),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  stockDisplayMode: z.enum(['visible', 'status_only', 'hidden']).optional(),
  
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
  minQuantity: z.number().min(0).optional(),
  quantityStep: z.number().positive().optional(),
});

export const UpdateDataSchema = CreateDataSchema.partial();

export const QueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(1000),
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  showAll: z.string().optional(), // Pentru admin panel
});

export type CreateDataInput = z.infer<typeof CreateDataSchema>;
export type UpdateDataInput = z.infer<typeof UpdateDataSchema>;
export type QueryParams = z.infer<typeof QueryParamsSchema>;
