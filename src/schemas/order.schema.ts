import { z } from 'zod';

export const CreateOrderSchema = z.object({
  items: z.array(z.object({
    dataItemId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().min(0.1, 'Quantity must be at least 0.1'), // Permite cantități fractionale (0.5kg, etc.)
    price: z.number().min(0, 'Price must be positive'),
    isGift: z.boolean().optional(), // Marchează dacă este cadou
    giftRuleId: z.string().optional() // ID-ul regulii de cadou (dacă este cadou)
  })).min(1, 'At least one item is required'),
  total: z.number().min(0, 'Total must be positive'),
  shippingAddress: z.string().min(10, 'Shipping address must be at least 10 characters'),
  deliveryPhone: z.string().optional(),
  deliveryName: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'transfer']).optional(),
  deliveryMethod: z.enum(['courier', 'pickup']).optional(),
  deliveryLocationId: z.string().optional(), // ID-ul locației de livrare selectate
  voucherCode: z.string().optional(),
  orderLocalTime: z.string().optional(),
  orderLocation: z.string().optional(),
  orderTimezone: z.string().optional()
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;