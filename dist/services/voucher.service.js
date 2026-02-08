"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoucherService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class VoucherService {
    async createVoucher(data) {
        return await prisma.voucher.create({
            data: {
                ...data,
                code: data.code.toUpperCase(),
            },
        });
    }
    async validateVoucher(code, cartTotal) {
        const voucher = await prisma.voucher.findUnique({
            where: { code: code.toUpperCase() }, // Case insensitive
        });
        if (!voucher || !voucher.isActive) {
            throw new Error('Invalid voucher code');
        }
        const now = new Date();
        if (voucher.validUntil && voucher.validUntil < now) {
            throw new Error('Voucher has expired');
        }
        if (voucher.minPurchase && cartTotal < voucher.minPurchase) {
            throw new Error(`Minimum purchase of ${voucher.minPurchase} RON required`);
        }
        let discount = 0;
        // Case insensitive comparison
        if (voucher.discountType.toLowerCase() === 'percentage') {
            discount = (cartTotal * voucher.discountValue) / 100;
            if (voucher.maxDiscount && discount > voucher.maxDiscount) {
                discount = voucher.maxDiscount;
            }
        }
        else {
            discount = voucher.discountValue;
        }
        return {
            voucher,
            discount,
            finalTotal: Math.max(0, cartTotal - discount)
        };
    }
    async useVoucher(voucherId) {
        return await prisma.voucher.update({
            where: { id: voucherId },
            data: { usedCount: { increment: 1 } },
        });
    }
    async getAllVouchers() {
        return await prisma.voucher.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async getUserVouchers(userId) {
        return await prisma.userVoucher.findMany({
            where: { userId },
            include: { voucher: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createVoucherRequest(userId, data) {
        return await prisma.voucherRequest.create({
            data: {
                userId,
                code: data.code.toUpperCase(),
                discountType: data.discountType,
                discountValue: data.discountValue,
                minPurchase: data.minPurchase,
                validUntil: data.validUntil,
                description: data.description,
                status: 'PENDING',
            },
        });
    }
    async getUserVoucherRequests(userId) {
        return await prisma.voucherRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateUserVoucherRequest(requestId, userId, data) {
        const request = await prisma.voucherRequest.findFirst({
            where: { id: requestId, userId },
        });
        if (!request) {
            throw new Error('Voucher request not found');
        }
        if (request.status !== 'PENDING') {
            throw new Error('Cannot update processed voucher request');
        }
        return await prisma.voucherRequest.update({
            where: { id: requestId },
            data: {
                code: data.code?.toUpperCase() || request.code,
                discountType: data.discountType || request.discountType,
                discountValue: data.discountValue || request.discountValue,
                minPurchase: data.minPurchase !== undefined ? data.minPurchase : request.minPurchase,
                validUntil: data.validUntil !== undefined ? data.validUntil : request.validUntil,
                description: data.description || request.description,
            },
        });
    }
    async deleteUserVoucherRequest(requestId, userId) {
        const request = await prisma.voucherRequest.findFirst({
            where: { id: requestId, userId },
        });
        if (!request) {
            throw new Error('Voucher request not found');
        }
        if (request.status !== 'PENDING') {
            throw new Error('Cannot delete processed voucher request');
        }
        return await prisma.voucherRequest.delete({
            where: { id: requestId },
        });
    }
}
exports.VoucherService = VoucherService;
