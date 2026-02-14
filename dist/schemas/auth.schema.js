"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginSchema = exports.RegisterSchema = void 0;
const zod_1 = require("zod");
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be less than 100 characters'),
    name: zod_1.z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters'),
    phone: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    county: zod_1.z.string().optional(),
    street: zod_1.z.string().optional(),
    streetNumber: zod_1.z.string().optional(),
    addressDetails: zod_1.z.string().optional(),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
