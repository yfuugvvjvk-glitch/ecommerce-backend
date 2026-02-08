"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProductSchema = exports.CreateProductSchema = void 0;
const zod_1 = require("zod");
exports.CreateProductSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: zod_1.z.string().optional(),
    content: zod_1.z.string().min(1, 'Content is required'),
    price: zod_1.z.number().min(0.01, 'Price must be positive'),
    oldPrice: zod_1.z.number().min(0).optional(),
    stock: zod_1.z.number().min(0, 'Stock must be non-negative'),
    image: zod_1.z.string().url('Invalid image URL').optional(),
    categoryId: zod_1.z.string().min(1, 'Category is required'),
    status: zod_1.z.enum(['draft', 'published', 'archived']).optional(),
    // Advanced fields
    isPerishable: zod_1.z.boolean().optional(),
    expirationDate: zod_1.z.string().optional(),
    productionDate: zod_1.z.string().optional(),
    advanceOrderDays: zod_1.z.number().min(0).max(30).optional(),
    orderCutoffTime: zod_1.z.string().optional(),
    deliveryTimeHours: zod_1.z.number().min(0).optional(),
    deliveryTimeDays: zod_1.z.number().min(0).optional(),
    paymentMethods: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
    unitType: zod_1.z.enum(['piece', 'kg', 'liter', 'meter']).optional(),
    unitName: zod_1.z.string().optional(),
    minQuantity: zod_1.z.number().min(0.01).optional(),
    quantityStep: zod_1.z.number().min(0.01).optional(),
    allowFractional: zod_1.z.boolean().optional(),
    availableQuantities: zod_1.z.array(zod_1.z.number().min(0.01)).optional()
});
exports.UpdateProductSchema = exports.CreateProductSchema.partial();
