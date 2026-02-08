import { PrismaClient } from '@prisma/client';
import { realtimeService } from './realtime.service';

const prisma = new PrismaClient();

export class AdvancedProductService {
  // Calculează stocul disponibil pentru un produs
  async calculateAvailableStock(productId: string): Promise<number> {
    const product = await prisma.dataItem.findUnique({
      where: { id: productId },
      select: { stock: true, reservedStock: true }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return Math.max(0, product.stock - product.reservedStock);
  }

  // Adaugă stoc nou
  async addStock(productId: string, quantity: number, reason: string, userId?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.dataItem.update({
        where: { id: productId },
        data: {
          stock: { increment: quantity },
          availableStock: { increment: quantity },
          lastRestockDate: new Date()
        },
        select: {
          id: true,
          title: true,
          stock: true,
          reservedStock: true,
          availableStock: true,
          unitName: true,
          price: true
        }
      });

      await tx.stockMovement.create({
        data: {
          dataItemId: productId,
          type: 'IN',
          quantity: quantity,
          reason: reason,
          userId: userId
        }
      });

      // Broadcast actualizare în timp real
      if (realtimeService) {
        realtimeService.broadcastInventoryUpdate(productId, {
          stock: updatedProduct.stock,
          reservedStock: updatedProduct.reservedStock,
          availableStock: updatedProduct.availableStock,
          lastUpdated: new Date(),
          productTitle: updatedProduct.title,
          unitName: updatedProduct.unitName || 'bucăți',
          price: updatedProduct.price
        });
      }
    });
  }

  // Obține statistici de stoc pentru admin
  async getStockStatistics(productId?: string): Promise<any> {
    const whereClause = productId ? { id: productId } : {};

    const products = await prisma.dataItem.findMany({
      where: whereClause,
      include: {
        category: {
          select: { name: true }
        },
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            type: true,
            quantity: true,
            reason: true,
            createdAt: true,
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    return products.map(product => {
      // Calculează informații despre expirare
      let expiryInfo = null;
      if (product.isPerishable && product.expiryDate) {
        const now = new Date();
        const daysUntilExpiry = Math.ceil((product.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        expiryInfo = {
          expiryDate: product.expiryDate,
          daysUntilExpiry,
          isExpired: daysUntilExpiry <= 0,
          isExpiringSoon: daysUntilExpiry <= 7 && daysUntilExpiry > 0
        };
      }

      // Calculează informații despre unități
      const unitInfo = {
        unitType: product.unitType || 'piece',
        unitName: product.unitName || 'bucată',
        minQuantity: product.minQuantity || 1,
        quantityStep: product.quantityStep || 1,
        allowFractional: product.allowFractional || false
      };

      // Calculează valoarea stocului
      const stockValue = product.availableStock * product.price;
      const totalValue = product.stock * product.price;

      return {
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock: product.availableStock,
        totalSold: product.totalSold,
        totalOrdered: product.totalOrdered,
        lowStockAlert: product.lowStockAlert,
        isInStock: product.isInStock,
        lastRestockDate: product.lastRestockDate,
        category: product.category,
        image: product.image,
        
        // Informații despre perisabilitate
        isPerishable: product.isPerishable,
        productionDate: product.productionDate,
        expiryInfo,
        
        // Informații despre unități
        unitInfo,
        
        // Calculuri
        needsRestock: product.availableStock <= product.lowStockAlert,
        stockTurnover: product.totalSold > 0 ? product.totalSold / (product.stock + product.totalSold) : 0,
        stockValue,
        totalValue,
        
        // Mișcări de stoc recente
        recentMovements: product.stockMovements,
        
        // Informații despre livrare
        deliveryInfo: {
          customDeliveryRules: product.customDeliveryRules,
          deliveryTimeHours: product.deliveryTimeHours,
          deliveryTimeDays: product.deliveryTimeDays,
          requiresAdvanceOrder: product.requiresAdvanceOrder,
          advanceOrderDays: product.advanceOrderDays,
          advanceOrderHours: product.advanceOrderHours
        },
        
        // Status general
        status: product.availableStock === 0 ? 'OUT_OF_STOCK' :
                product.availableStock <= product.lowStockAlert ? 'LOW_STOCK' :
                expiryInfo?.isExpired ? 'EXPIRED' :
                expiryInfo?.isExpiringSoon ? 'EXPIRING_SOON' : 'IN_STOCK'
      };
    });
  }

  // Metodele lipsă pentru compatibilitate
  async reserveStock(productId: string, quantity: number, orderId?: string): Promise<void> {
    // Implementare simplă pentru moment
    console.log(`Reserve stock: ${quantity} for product ${productId}`);
  }

  async releaseReservedStock(productId: string, quantity: number, orderId?: string): Promise<void> {
    // Implementare simplă pentru moment
    console.log(`Release stock: ${quantity} for product ${productId}`);
  }

  async confirmSale(productId: string, quantity: number, orderId?: string): Promise<void> {
    // Implementare simplă pentru moment
    console.log(`Confirm sale: ${quantity} for product ${productId}`);
  }

  async canOrderProduct(productId: string, requestedDeliveryDate?: Date): Promise<{
    canOrder: boolean;
    earliestDeliveryDate?: Date;
    message?: string;
  }> {
    return { canOrder: true };
  }

  async checkProductExpiry(productId: string): Promise<{
    isExpired: boolean;
    expiryDate?: Date;
    daysUntilExpiry?: number;
  }> {
    return { isExpired: false };
  }

  async markExpiredProducts(): Promise<void> {
    console.log('Mark expired products - placeholder');
  }
}

export const advancedProductService = new AdvancedProductService();