import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class VoucherService {
  async createVoucher(data: any) {
    const existing = await prisma.voucher.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new Error('Voucher code already exists');
    }

    return await prisma.voucher.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
      },
    });
  }

  async validateVoucher(code: string, cartTotal: number) {
    const voucher = await prisma.voucher.findUnique({
      where: { code: code.toUpperCase() },
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
    if (voucher.discountType === 'percentage') {
      discount = (cartTotal * voucher.discountValue) / 100;
      if (voucher.maxDiscount && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    } else {
      discount = voucher.discountValue;
    }

    return {
      voucher,
      discount: Math.min(discount, cartTotal),
      finalTotal: Math.max(0, cartTotal - discount),
    };
  }

  async useVoucher(voucherId: string) {
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

  async getUserVouchers(userId: string) {
    return await prisma.userVoucher.findMany({
      where: { userId },
      include: {
        voucher: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVoucherRequest(userId: string, data: {
    code: string;
    discountType: string;
    discountValue: number;
    minPurchase: number | null;
    validUntil: Date | null;
    description: string;
  }) {
    // Check if code already exists in requests or vouchers
    const existingVoucher = await prisma.voucher.findUnique({
      where: { code: data.code },
    });
    
    if (existingVoucher) {
      throw new Error('Acest cod de voucher există deja în sistem');
    }

    return await prisma.voucherRequest.create({
      data: {
        userId,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minPurchase: data.minPurchase,
        validUntil: data.validUntil,
        description: data.description,
        status: 'PENDING',
      },
    });
  }

  async getUserVoucherRequests(userId: string) {
    return await prisma.voucherRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserVoucherRequest(requestId: string, userId: string, data: any) {
    // Verify ownership
    const request = await prisma.voucherRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Only allow editing pending requests
    if (request.status !== 'PENDING') {
      throw new Error('Can only edit pending requests');
    }

    return await prisma.voucherRequest.update({
      where: { id: requestId },
      data: {
        code: data.code,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minPurchase: data.minPurchase,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    });
  }

  async deleteUserVoucherRequest(requestId: string, userId: string) {
    // Verify ownership
    const request = await prisma.voucherRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return await prisma.voucherRequest.delete({
      where: { id: requestId },
    });
  }
}
