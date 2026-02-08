import { z } from 'zod';

export const CreateProductSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  price: z.number().min(0.01, 'Price must be positive'),
  oldPrice: z.number().min(0).optional(),
  stock: z.number().min(0, 'Stock must be non-negative'),
  image: z.string().url('Invalid image URL').optional(),
  categoryId: z.string().min(1, 'Category is required'),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  
  // Advanced fields
  isPerishable: z.boolean().optional(),
  expirationDate: z.string().optional(),
  productionDate: z.string().optional(),
  advanceOrderDays: z.number().min(0).max(30).optional(),
  orderCutoffTime: z.string().optional(),
  deliveryTimeHours: z.number().min(0).optional(),
  deliveryTimeDays: z.number().min(0).optional(),
  paymentMethods: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  unitType: z.enum(['piece', 'kg', 'liter', 'meter']).optional(),
  unitName: z.string().optional(),
  minQuantity: z.number().min(0.01).optional(),
  quantityStep: z.number().min(0.01).optional(),
  allowFractional: z.boolean().optional(),
  availableQuantities: z.array(z.number().min(0.01)).optional()
});

export const UpdateProductSchema = CreateProductSchema.partial();

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;