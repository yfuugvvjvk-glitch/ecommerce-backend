import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AdminService {
  // Dashboard statistics
  async getDashboardStats() {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.dataItem.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.count({ where: { status: 'pending' } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      pendingOrders,
      recentOrders,
    };
  }

  // User management
  async getAllUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return { users, total, page, limit };
  }

  async updateUserRole(userId: string, role: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async deleteUser(userId: string) {
    return await prisma.user.delete({
      where: { id: userId },
    });
  }

  // Order management
  async getAllOrders(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
          orderItems: { include: { dataItem: { include: { category: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  async updateOrderStatus(orderId: string, status: string) {
    return await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async deleteOrder(orderId: string) {
    return await prisma.order.delete({
      where: { id: orderId },
    });
  }

  // Voucher management
  async createVoucher(data: any) {
    // Convert validUntil to proper ISO format if provided
    if (data.validUntil) {
      data.validUntil = new Date(data.validUntil).toISOString();
    }
    
    return await prisma.voucher.create({ data });
  }

  async getAllVouchers() {
    return await prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateVoucher(voucherId: string, data: any) {
    // Convert validUntil to proper ISO format if provided
    if (data.validUntil) {
      data.validUntil = new Date(data.validUntil).toISOString();
    }
    
    return await prisma.voucher.update({
      where: { id: voucherId },
      data,
    });
  }

  async deleteVoucher(voucherId: string) {
    return await prisma.voucher.delete({
      where: { id: voucherId },
    });
  }

  // Voucher requests management
  async getAllVoucherRequests() {
    return await prisma.voucherRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveVoucherRequest(requestId: string) {
    const request = await prisma.voucherRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    // Check if voucher with this code already exists
    const existingVoucher = await prisma.voucher.findUnique({
      where: { code: request.code },
    });

    let voucher;
    if (existingVoucher) {
      // Update existing voucher instead of creating new one
      voucher = await prisma.voucher.update({
        where: { code: request.code },
        data: {
          description: request.description,
          discountType: request.discountType,
          discountValue: request.discountValue,
          minPurchase: request.minPurchase,
          validUntil: request.validUntil,
          isActive: true,
        },
      });
    } else {
      // Create new voucher from request
      voucher = await prisma.voucher.create({
        data: {
          code: request.code,
          description: request.description,
          discountType: request.discountType,
          discountValue: request.discountValue,
          minPurchase: request.minPurchase,
          maxDiscount: null,
          maxUsage: null,
          validUntil: request.validUntil,
          isActive: true,
          createdById: request.userId,
        },
      });
    }

    // Update request status
    await prisma.voucherRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    return voucher;
  }

  async rejectVoucherRequest(requestId: string) {
    const request = await prisma.voucherRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    return await prisma.voucherRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  async resetVoucherRequest(requestId: string) {
    const request = await prisma.voucherRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    return await prisma.voucherRequest.update({
      where: { id: requestId },
      data: { status: 'PENDING' },
    });
  }

  async updateVoucherRequest(requestId: string, data: any) {
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

  async deleteVoucherRequest(requestId: string) {
    return await prisma.voucherRequest.delete({
      where: { id: requestId },
    });
  }
}
