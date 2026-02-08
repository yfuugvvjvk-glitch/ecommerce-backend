import { z } from 'zod';

export const AddToCartSchema = z.object({
  dataItemId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100')
});

export const UpdateCartQuantitySchema = z.object({
  quantity: z.number().min(0, 'Quantity must be non-negative').max(100, 'Quantity cannot exceed 100')
});

export type AddToCartInput = z.infer<typeof AddToCartSchema>;
export type UpdateCartQuantityInput = z.infer<typeof UpdateCartQuantitySchema>;