import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OrderService {
  async createOrder(userId: string, data: {
    items: Array<{ dataItemId: string; quantity: number; price: number }>;
    total: number;
    shippingAddress: string;
    deliveryPhone?: string;
    deliveryName?: string;
    paymentMethod?: string;
    deliveryMethod?: string;
    voucherCode?: string;
  }) {
    // Use transaction to ensure stock is updated atomically
    return await prisma.$transaction(async (tx) => {
      // Check and update stock for each item
      for (const item of data.items) {
        const product = await tx.dataItem.findUnique({
          where: { id: item.dataItemId },
        });

        if (!product) {
          throw new Error(`Product ${item.dataItemId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${item.quantity}`);
        }

        // Decrease stock
        await tx.dataItem.update({
          where: { id: item.dataItemId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Handle voucher if provided
      let voucherId: string | undefined;
      if (data.voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: { code: data.voucherCode },
        });

        if (voucher && voucher.isActive) {
          // Increment voucher usage count
          await tx.voucher.update({
            where: { id: voucher.id },
            data: { usedCount: { increment: 1 } },
          });
          voucherId = voucher.id;
        }
      }

      // Create the order
      const order = await tx.order.create({
        data: {
          userId,
          total: data.total,
          shippingAddress: data.shippingAddress,
          deliveryPhone: data.deliveryPhone,
          deliveryName: data.deliveryName,
          paymentMethod: data.paymentMethod || 'cash',
          deliveryMethod: data.deliveryMethod || 'courier',
          status: 'PROCESSING',
          orderItems: {
            create: data.items.map(item => ({
              dataItemId: item.dataItemId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              dataItem: true,
            },
          },
        },
      });

      // Create UserVoucher record if voucher was used
      if (voucherId) {
        await tx.userVoucher.create({
          data: {
            userId,
            voucherId,
            orderId: order.id,
            usedAt: new Date(),
          },
        });
      }

      // Clear user's cart after successful order
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return order;
    });
  }

  async getMyOrders(userId: string) {
    return await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            dataItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, userId: string) {
    return await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        orderItems: {
          include: {
            dataItem: true,
          },
        },
      },
    });
  }
}
