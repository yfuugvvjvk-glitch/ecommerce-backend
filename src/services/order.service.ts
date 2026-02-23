﻿import { PrismaClient } from '@prisma/client';
import { realtimeService } from './realtime.service';

const prisma = new PrismaClient();

// Mock storage pentru setÄrile de blocare (Ă®n producČ›ie ar fi Ă®n baza de date)
let orderBlockSettings = {
  blockNewOrders: false,
  blockReason: '',
  blockUntil: undefined as string | undefined,
  allowedPaymentMethods: ['cash', 'card', 'transfer', 'crypto'],
  minimumOrderValue: 0,
  maximumOrderValue: undefined as number | undefined
};

export class OrderService {
  // ObČ›ine setÄrile de blocare comenzi
  async getOrderBlockSettings() {
    try {
      // ĂŽncearcÄ sÄ obČ›ii din baza de date
      const config = await prisma.siteConfig.findUnique({
        where: { key: 'order_block_settings' }
      });
      
      if (config && config.value) {
        return JSON.parse(config.value as string);
      }
    } catch (error) {
      console.error('Error loading order block settings from DB:', error);
    }
    
    // ReturneazÄ valorile implicite dacÄ nu existÄ Ă®n DB
    return orderBlockSettings;
  }

  // ActualizeazÄ setÄrile de blocare comenzi
  async updateOrderBlockSettings(settings: typeof orderBlockSettings) {
      try {
        // Salvează în baza de date
        await prisma.siteConfig.upsert({
          where: { key: 'order_block_settings' },
          update: { value: JSON.stringify(settings), updatedAt: new Date() },
          create: { 
            id: crypto.randomUUID(),
            key: 'order_block_settings', 
            value: JSON.stringify(settings),
            description: 'Order blocking settings',
            updatedAt: new Date(),
          }
        });

        // Actualizează și în memorie pentru performanță
        orderBlockSettings = { ...settings };
        return orderBlockSettings;
      } catch (error) {
        console.error('Error saving order block settings to DB:', error);
        throw error;
      }
    }


  async createOrder(userId: string, data: {
    items: Array<{ dataItemId: string; quantity: number; price: number; isGift?: boolean; giftRuleId?: string }>;
    total: number;
    shippingAddress: string;
    deliveryPhone?: string;
    deliveryName?: string;
    paymentMethod?: string;
    deliveryMethod?: string;
    deliveryLocationId?: string;
    voucherCode?: string;
    orderLocalTime?: string;
    orderLocation?: string;
    orderTimezone?: string;
  }) {
    // === VERIFICARE BLOCARE COMENZI ===
    // VerificÄ dacÄ comenzile sunt blocate
    const blockSettings = await this.getOrderBlockSettings();
    
    if (blockSettings.blockNewOrders) {
      // VerificÄ dacÄ blocarea este temporarÄ Č™i a expirat
      if (blockSettings.blockUntil) {
        const blockUntilDate = new Date(blockSettings.blockUntil);
        if (new Date() < blockUntilDate) {
          throw new Error(`Comenzile sunt blocate temporar. Motiv: ${blockSettings.blockReason || 'Indisponibil temporar'}. Comenzile vor fi disponibile dupÄ ${blockUntilDate.toLocaleString('ro-RO')}`);
        }
      } else {
        // Blocare permanentÄ
        throw new Error(`Comenzile sunt blocate momentan. Motiv: ${blockSettings.blockReason || 'Indisponibil temporar'}`);
      }
    }

    // VerificÄ valoarea minimÄ a comenzii
    if (data.total < blockSettings.minimumOrderValue) {
      throw new Error(`Valoarea minimÄ a comenzii este ${blockSettings.minimumOrderValue} RON. Valoarea ta: ${data.total} RON`);
    }

    // VerificÄ valoarea maximÄ a comenzii (dacÄ este setatÄ)
    if (blockSettings.maximumOrderValue && data.total > blockSettings.maximumOrderValue) {
      throw new Error(`Valoarea maximÄ a comenzii este ${blockSettings.maximumOrderValue} RON. Valoarea ta: ${data.total} RON`);
    }

    // VerificÄ metoda de platÄ
    if (data.paymentMethod && !blockSettings.allowedPaymentMethods.includes(data.paymentMethod)) {
      const allowedMethods = blockSettings.allowedPaymentMethods.map((m: string) => {
        switch(m) {
          case 'cash': return 'Numerar';
          case 'card': return 'Card';
          case 'transfer': return 'Transfer';
          case 'crypto': return 'Crypto';
          default: return m;
        }
      }).join(', ');
      throw new Error(`Metoda de platÄ "${data.paymentMethod}" nu este disponibilÄ. Metode permise: ${allowedMethods}`);
    }

    // === VALIDARE CADOURI ===
    // SeparÄ produsele normale de cadouri
    const giftItems = data.items.filter(item => item.isGift);
    const regularItems = data.items.filter(item => !item.isGift);

    // ValideazÄ cadourile dacÄ existÄ
    if (giftItems.length > 0) {
      // ConstruieČ™te cartItems pentru validare
      const cartItemsForValidation = await Promise.all(
        data.items.map(async (item) => {
          const product = await prisma.dataItem.findUnique({
            where: { id: item.dataItemId },
            select: {
              id: true,
              title: true,
              price: true,
              categoryId: true,
              stock: true,
            },
          });

          if (!product) {
            throw new Error(`Product ${item.dataItemId} not found`);
          }

          return {
            id: item.dataItemId, // Temporary ID for validation
            productId: item.dataItemId,
            quantity: item.quantity,
            isGift: item.isGift || false,
            giftRuleId: item.giftRuleId || null,
            dataItem: {
              id: product.id,
              title: product.title,
              price: product.price,
              categoryId: product.categoryId,
              stock: product.stock,
            },
          };
        })
      );

      // ImportÄ giftValidator
      const { giftValidator } = await import('./gift-validator.service');
      
      // ValideazÄ toate cadourile
      const validation = await giftValidator.validateGiftsInOrder(
        userId,
        cartItemsForValidation
      );

      if (!validation.isValid) {
        throw new Error(`Invalid gifts in order: ${validation.errors.join(', ')}`);
      }
    }

    // Use transaction to ensure stock is updated atomically
    return await prisma.$transaction(async (tx) => {
      // Verificare Č™i rezervare stoc pentru fiecare produs
      for (const item of data.items) {
        const product = await tx.dataItem.findUnique({
          where: { id: item.dataItemId },
        });

        if (!product) {
          throw new Error(`Product ${item.dataItemId} not found`);
        }

        // VerificÄ stocul disponibil (nu rezervat)
        const availableStock = product.availableStock || product.stock;
        if (availableStock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.title}. Available: ${availableStock}, Requested: ${item.quantity}`);
        }

        // RezervÄ stocul (nu Ă®l scade Ă®ncÄ)
        await tx.dataItem.update({
          where: { id: item.dataItemId },
          data: {
            reservedStock: { increment: item.quantity },
            availableStock: { decrement: item.quantity },
          },
        });
      }

      // Handle voucher if provided
      let voucherId: string | undefined;
      if (data.voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: { code: data.voucherCode.toUpperCase() }, // Case insensitive
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
          id: crypto.randomUUID(),
          userId,
          total: data.total,
          shippingAddress: data.shippingAddress,
          deliveryPhone: data.deliveryPhone,
          deliveryName: data.deliveryName,
          paymentMethod: data.paymentMethod || 'cash',
          deliveryMethod: data.deliveryMethod || 'courier',
          deliveryLocationId: data.deliveryLocationId, // SalveazÄ ID-ul locaČ›iei de livrare
          status: 'PROCESSING',
          orderLocalTime: data.orderLocalTime,
          orderLocation: data.orderLocation,
          orderTimezone: data.orderTimezone,
          createdAt: new Date(),
          updatedAt: new Date(),
          orderItems: {
            create: data.items.map(item => ({
              id: crypto.randomUUID(),
              dataItemId: item.dataItemId,
              quantity: item.quantity,
              price: item.isGift ? 0 : item.price, // Cadourile au preČ› 0
              isGift: item.isGift || false,
              giftRuleId: item.giftRuleId || null,
              originalPrice: item.price, // SalveazÄ preČ›ul original pentru raportare
            })),
          },
        },
        include: {
          orderItems: {
            include: { dataItem: true,
            },
          },
        },
      });

      // === PROCESARE CADOURI ===
      // Pentru fiecare cadou, creeazÄ Ă®nregistrare Ă®n GiftRuleUsage Č™i incrementeazÄ currentTotalUses
      for (const item of data.items) {
        if (item.isGift && item.giftRuleId) {
          // CreeazÄ Ă®nregistrare de utilizare
          await tx.giftRuleUsage.create({
            data: {
              id: crypto.randomUUID(),
              giftRuleId: item.giftRuleId,
              userId,
              orderId: order.id,
              productId: item.dataItemId,
            },
          });

          // IncrementeazÄ contorul de utilizÄri totale
          await tx.giftRule.update({
            where: { id: item.giftRuleId },
            data: {
              currentTotalUses: { increment: 1 },
            },
          });
        }
      }

      // Create UserVoucher record if voucher was used
      if (voucherId) {
        await tx.userVoucher.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            voucherId,
            orderId: order.id,
            usedAt: new Date(),
            createdAt: new Date(),
          },
        });
      }

      // Clear user's cart after successful order
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      // Broadcast new order to admin dashboard
      if (realtimeService) {
        realtimeService.broadcastNewOrder(order);
      }

      return order;
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: { dataItem: true },
          },
          DeliveryLocation: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // SalveazÄ statusul anterior pentru a gestiona corect tranziČ›ia
      const previousStatus = order.status;

      console.log(`đź”„ Updating order ${orderId} from ${previousStatus} to ${status}`);

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          orderItems: {
            include: { dataItem: true,
            },
          },
        },
      });

      // Handle stock based on status change
      // Cazul 1: TranziČ›ie cÄtre DELIVERED (din orice alt status)
      if (status === 'DELIVERED' && previousStatus !== 'DELIVERED') {
        console.log(`đź“¦ Processing DELIVERED status change from ${previousStatus}`);
        // Finalize stock reduction - move from reserved to sold
        for (const item of order.orderItems) {
          console.log(`  Product: ${item.dataItem.title}, Quantity: ${item.quantity}`);
          // DacÄ comanda era CANCELLED, stocul nu era rezervat, deci scÄdem direct din stock Č™i availableStock
          if (previousStatus === 'CANCELLED') {
            console.log(`  âš ď¸Ź  Was CANCELLED - decrementing stock and availableStock`);
            await tx.dataItem.update({
              where: { id: item.dataItemId },
              data: {
                stock: { decrement: item.quantity },
                availableStock: { decrement: item.quantity },
                totalSold: { increment: item.quantity },
              },
            });
          } else {
            console.log(`  â„ąď¸Ź  Was ${previousStatus} - decrementing stock and reservedStock`);
            
            // VerificÄm stocul rezervat Ă®nainte de decrement
            const currentProduct = await tx.dataItem.findUnique({
              where: { id: item.dataItemId },
              select: { reservedStock: true, stock: true, title: true }
            });
            
            if (currentProduct && currentProduct.reservedStock < item.quantity) {
              console.warn(`âš ď¸Ź  Warning: Reserved stock (${currentProduct.reservedStock}) is less than quantity (${item.quantity}) for ${currentProduct.title}`);
              // CorectÄm: setÄm reservedStock la 0 Ă®n loc sÄ decrementÄm
              await tx.dataItem.update({
                where: { id: item.dataItemId },
                data: {
                  stock: { decrement: item.quantity },
                  reservedStock: 0, // ResetÄm la 0 Ă®n loc de decrement
                  totalSold: { increment: item.quantity },
                },
              });
            } else {
              // Altfel, scÄdem din stock Č™i din reservedStock (availableStock deja scÄzut)
              await tx.dataItem.update({
                where: { id: item.dataItemId },
                data: {
                  stock: { decrement: item.quantity },
                  reservedStock: { decrement: item.quantity },
                  totalSold: { increment: item.quantity },
                },
              });
            }
          }

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              id: crypto.randomUUID(),
              dataItemId: item.dataItemId,
              type: 'OUT',
              quantity: item.quantity,
              reason: `Order delivered #${orderId.slice(-6)}`,
              orderId: orderId,
              createdAt: new Date(),
            },
          });

          // Broadcast inventory update
          if (realtimeService) {
            const updatedProduct = await tx.dataItem.findUnique({
              where: { id: item.dataItemId },
              select: { 
                stock: true, 
                reservedStock: true, 
                availableStock: true, 
                title: true, 
                unitName: true, 
                price: true 
              }
            });
            
            if (updatedProduct) {
              realtimeService.broadcastInventoryUpdate(item.dataItemId, {
                stock: updatedProduct.stock,
                reservedStock: updatedProduct.reservedStock,
                availableStock: updatedProduct.availableStock,
                lastUpdated: new Date(),
                productTitle: updatedProduct.title,
                unitName: updatedProduct.unitName,
                price: updatedProduct.price
              });
            }
          }
        }
      } else if (status === 'CANCELLED' && previousStatus !== 'CANCELLED') {
        // Cazul 2: TranziČ›ie cÄtre CANCELLED
        // DacÄ comanda era DELIVERED, trebuie sÄ adÄugÄm Ă®napoi Ă®n stock
        if (previousStatus === 'DELIVERED') {
          for (const item of order.orderItems) {
            await tx.dataItem.update({
              where: { id: item.dataItemId },
              data: {
                stock: { increment: item.quantity },
                availableStock: { increment: item.quantity },
                totalSold: { decrement: item.quantity },
              },
            });

            // Create stock movement record
            await tx.stockMovement.create({
              data: {
                id: crypto.randomUUID(),
                dataItemId: item.dataItemId,
                type: 'RELEASED',
                quantity: item.quantity,
                reason: `Order cancelled (was delivered) #${orderId.slice(-6)}`,
                orderId: orderId,
                createdAt: new Date(),
              },
            });

            // Broadcast inventory update
            if (realtimeService) {
              const updatedProduct = await tx.dataItem.findUnique({
                where: { id: item.dataItemId },
                select: { 
                  stock: true, 
                  reservedStock: true, 
                  availableStock: true, 
                  title: true, 
                  unitName: true, 
                  price: true 
                }
              });
              
              if (updatedProduct) {
                realtimeService.broadcastInventoryUpdate(item.dataItemId, {
                  stock: updatedProduct.stock,
                  reservedStock: updatedProduct.reservedStock,
                  availableStock: updatedProduct.availableStock,
                  lastUpdated: new Date(),
                  productTitle: updatedProduct.title,
                  unitName: updatedProduct.unitName,
                  price: updatedProduct.price
                });
              }
            }
          }
        } else {
          // DacÄ comanda era Ă®n alt status (PROCESSING, etc.), doar eliberÄm stocul rezervat
          for (const item of order.orderItems) {
            // VerificÄm stocul rezervat Ă®nainte de decrement
            const currentProduct = await tx.dataItem.findUnique({
              where: { id: item.dataItemId },
              select: { reservedStock: true, availableStock: true, title: true }
            });
            
            if (currentProduct && currentProduct.reservedStock < item.quantity) {
              console.warn(`âš ď¸Ź  Warning: Reserved stock (${currentProduct.reservedStock}) is less than quantity (${item.quantity}) for ${currentProduct.title}`);
              // CorectÄm: setÄm reservedStock la 0 Č™i ajustÄm availableStock
              await tx.dataItem.update({
                where: { id: item.dataItemId },
                data: {
                  reservedStock: 0,
                  availableStock: { increment: currentProduct.reservedStock }, // IncrementÄm doar cu cĂ˘t era rezervat
                },
              });
            } else {
              await tx.dataItem.update({
                where: { id: item.dataItemId },
                data: {
                  reservedStock: { decrement: item.quantity },
                  availableStock: { increment: item.quantity },
                },
              });
            }

            // Create stock movement record
            await tx.stockMovement.create({
              data: {
                id: crypto.randomUUID(),
                dataItemId: item.dataItemId,
                type: 'RELEASED',
                quantity: item.quantity,
                reason: `Order cancelled #${orderId.slice(-6)}`,
                orderId: orderId,
                createdAt: new Date(),
              },
            });

            // Broadcast inventory update
            if (realtimeService) {
              const updatedProduct = await tx.dataItem.findUnique({
                where: { id: item.dataItemId },
                select: { 
                  stock: true, 
                  reservedStock: true, 
                  availableStock: true, 
                  title: true, 
                  unitName: true, 
                  price: true 
                }
              });
              
              if (updatedProduct) {
                realtimeService.broadcastInventoryUpdate(item.dataItemId, {
                  stock: updatedProduct.stock,
                  reservedStock: updatedProduct.reservedStock,
                  availableStock: updatedProduct.availableStock,
                  lastUpdated: new Date(),
                  productTitle: updatedProduct.title,
                  unitName: updatedProduct.unitName,
                  price: updatedProduct.price
                });
              }
            }
          }
        }
      } else if (previousStatus === 'DELIVERED' && status !== 'DELIVERED' && status !== 'CANCELLED') {
        // Cazul 3: TranziČ›ie din DELIVERED cÄtre alt status (nu CANCELLED)
        // Trebuie sÄ adÄugÄm Ă®napoi Ă®n stock Č™i sÄ rezervÄm
        for (const item of order.orderItems) {
          await tx.dataItem.update({
            where: { id: item.dataItemId },
            data: {
              stock: { increment: item.quantity },
              reservedStock: { increment: item.quantity },
              totalSold: { decrement: item.quantity },
            },
          });

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              id: crypto.randomUUID(),
              dataItemId: item.dataItemId,
              type: 'RELEASED',
              quantity: item.quantity,
              reason: `Order status changed from delivered #${orderId.slice(-6)}`,
              orderId: orderId,
              createdAt: new Date(),
            },
          });

          // Broadcast inventory update
          if (realtimeService) {
            const updatedProduct = await tx.dataItem.findUnique({
              where: { id: item.dataItemId },
              select: { 
                stock: true, 
                reservedStock: true, 
                availableStock: true, 
                title: true, 
                unitName: true, 
                price: true 
              }
            });
            
            if (updatedProduct) {
              realtimeService.broadcastInventoryUpdate(item.dataItemId, {
                stock: updatedProduct.stock,
                reservedStock: updatedProduct.reservedStock,
                availableStock: updatedProduct.availableStock,
                lastUpdated: new Date(),
                productTitle: updatedProduct.title,
                unitName: updatedProduct.unitName,
                price: updatedProduct.price
              });
            }
          }
        }
      }

      // Broadcast order status update
      if (realtimeService) {
        realtimeService.broadcastOrderUpdate(orderId, status, updatedOrder);
      }

      return updatedOrder;
    });
  }

  async getMyOrders(userId: string) {
    return await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: { dataItem: true },
        },
        DeliveryLocation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, userId: string) {
    return await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        orderItems: {
          include: { dataItem: true },
        },
        DeliveryLocation: true,
      },
    });
  }

  async getAllOrders(page: number = 1, limit: number = 100, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { name: true, email: true },
          },
          orderItems: {
            include: { dataItem: true },
          },
          DeliveryLocation: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderStats() {
    const [
      totalOrders,
      totalRevenue,
      todayOrders,
      todayRevenue,
      pendingOrders,
      processingOrders,
      deliveredOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: 'DELIVERED' },
      }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          status: 'DELIVERED',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      todayOrders,
      todayRevenue: todayRevenue._sum.total || 0,
      pendingOrders,
      processingOrders,
      deliveredOrders,
    };
  }
}