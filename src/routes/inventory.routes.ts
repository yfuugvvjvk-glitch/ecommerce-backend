import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function inventoryRoutes(fastify: FastifyInstance) {
  // Verifică disponibilitatea unui produs
  fastify.get('/inventory/check/:productId', async (request, reply) => {
    try {
      const { productId } = request.params as { productId: string };
      const { quantity } = request.query as { quantity?: string };
      
      const requestedQty = quantity ? parseInt(quantity, 10) : 1;
      
      if (isNaN(requestedQty) || requestedQty <= 0) {
        return reply.code(400).send({ 
          error: 'Invalid quantity',
          available: false 
        });
      }

      const product = await prisma.dataItem.findUnique({
        where: { id: productId },
        select: {
          id: true,
          title: true,
          stock: true,
          reservedStock: true,
          trackInventory: true,
          isInStock: true,
          unitName: true,
          stockDisplayMode: true
        }
      });

      if (!product) {
        return reply.code(404).send({ 
          error: 'Product not found',
          available: false 
        });
      }

      const availableStock = product.stock - (product.reservedStock || 0);
      const isAvailable = !product.trackInventory || availableStock >= requestedQty;

      reply.send({
        productId: product.id,
        productTitle: product.title,
        available: isAvailable,
        stock: product.stock,
        reservedStock: product.reservedStock || 0,
        availableStock,
        requestedQuantity: requestedQty,
        unitName: product.unitName || 'buc',
        trackInventory: product.trackInventory,
        stockDisplayMode: product.stockDisplayMode || 'visible'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage, available: false });
    }
  });

  // Verifică disponibilitatea pentru mai multe produse
  fastify.post('/inventory/check-multiple', async (request, reply) => {
    try {
      const { items } = request.body as { items: Array<{ productId: string; quantity: number }> };
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return reply.code(400).send({ error: 'Invalid items array' });
      }

      const productIds = items.map(item => item.productId);
      
      const products = await prisma.dataItem.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          title: true,
          stock: true,
          reservedStock: true,
          trackInventory: true,
          unitName: true
        }
      });

      const results = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        
        if (!product) {
          return {
            productId: item.productId,
            available: false,
            error: 'Product not found'
          };
        }

        const availableStock = product.stock - (product.reservedStock || 0);
        const isAvailable = !product.trackInventory || availableStock >= item.quantity;

        return {
          productId: product.id,
          productTitle: product.title,
          available: isAvailable,
          stock: product.stock,
          reservedStock: product.reservedStock || 0,
          availableStock,
          requestedQuantity: item.quantity,
          unitName: product.unitName || 'buc'
        };
      });

      const allAvailable = results.every(r => r.available);

      reply.send({
        allAvailable,
        items: results
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Obține statistici inventar
  fastify.get('/inventory/stats', async (request, reply) => {
    try {
      const [totalProducts, inStock, outOfStock, lowStock] = await Promise.all([
        prisma.dataItem.count(),
        prisma.dataItem.count({ where: { isInStock: true } }),
        prisma.dataItem.count({ where: { isInStock: false } }),
        prisma.dataItem.count({
          where: {
            AND: [
              { isInStock: true },
              { stock: { lte: prisma.dataItem.fields.lowStockAlert } }
            ]
          }
        })
      ]);

      reply.send({
        totalProducts,
        inStock,
        outOfStock,
        lowStock
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });
}
