"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryParamsSchema = exports.UpdateDataSchema = exports.CreateDataSchema = void 0;
const zod_1 = require("zod");
exports.CreateDataSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: zod_1.z.string().max(500, 'Description too long').optional(),
    content: zod_1.z.string().min(1, 'Content is required'),
    price: zod_1.z.number().positive('Price must be positive'),
    oldPrice: zod_1.z.number().positive('Old price must be positive').nullable().optional(),
    stock: zod_1.z.number().int().min(0, 'Stock cannot be negative'),
    image: zod_1.z.string().min(1, 'Image is required'),
    categoryId: zod_1.z.string().min(1, 'Category is required'),
    status: zod_1.z.enum(['draft', 'published', 'archived']).default('draft'),
    // Carousel settings
    showInCarousel: zod_1.z.boolean().optional(),
    carouselOrder: zod_1.z.number().int().min(0).optional(),
    // Advanced product fields
    isPerishable: zod_1.z.boolean().optional(),
    expirationDate: zod_1.z.string().nullable().optional(),
    productionDate: zod_1.z.string().nullable().optional(),
    advanceOrderDays: zod_1.z.number().int().min(0).optional(),
    orderCutoffTime: zod_1.z.string().optional(),
    deliveryTimeHours: zod_1.z.number().int().min(0).nullable().optional(),
    deliveryTimeDays: zod_1.z.number().int().min(0).nullable().optional(),
    paymentMethods: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
    unitType: zod_1.z.string().optional(),
    unitName: zod_1.z.string().optional(),
    availableQuantities: zod_1.z.array(zod_1.z.number()).optional(),
    allowFractional: zod_1.z.boolean().optional(),
    minQuantity: zod_1.z.number().optional(),
    quantityStep: zod_1.z.number().optional(),
});
exports.UpdateDataSchema = exports.CreateDataSchema.partial();
exports.QueryParamsSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    search: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
});
