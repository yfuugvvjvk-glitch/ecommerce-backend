"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCartQuantitySchema = exports.AddToCartSchema = void 0;
const zod_1 = require("zod");
exports.AddToCartSchema = zod_1.z.object({
    dataItemId: zod_1.z.string().min(1, 'Product ID is required'),
    quantity: zod_1.z.number().min(0.1, 'Quantity must be at least 0.1').max(100, 'Quantity cannot exceed 100')
});
exports.UpdateCartQuantitySchema = zod_1.z.object({
    quantity: zod_1.z.number().min(0.1, 'Quantity must be at least 0.1').max(100, 'Quantity cannot exceed 100')
});
