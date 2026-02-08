"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOrderStatusSchema = exports.CreateOrderSchema = void 0;
const zod_1 = require("zod");
exports.CreateOrderSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        dataItemId: zod_1.z.string().min(1, 'Product ID is required'),
        quantity: zod_1.z.number().min(1, 'Quantity must be at least 1'),
        price: zod_1.z.number().min(0, 'Price must be positive')
    })).min(1, 'At least one item is required'),
    total: zod_1.z.number().min(0, 'Total must be positive'),
    shippingAddress: zod_1.z.string().min(10, 'Shipping address must be at least 10 characters'),
    deliveryPhone: zod_1.z.string().optional(),
    deliveryName: zod_1.z.string().optional(),
    paymentMethod: zod_1.z.enum(['cash', 'card', 'transfer']).optional(),
    deliveryMethod: zod_1.z.enum(['courier', 'pickup']).optional(),
    voucherCode: zod_1.z.string().optional(),
    orderLocalTime: zod_1.z.string().optional(),
    orderLocation: zod_1.z.string().optional(),
    orderTimezone: zod_1.z.string().optional()
});
exports.UpdateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['PROCESSING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
});
