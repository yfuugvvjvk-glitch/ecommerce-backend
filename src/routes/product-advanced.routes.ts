import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware';
import { advancedProductService } from '../services/advanced-product.service';

export async function productAdvancedRoutes(fastify: FastifyInstance) {
  // Verifică dacă un produs poate fi comandat
  fastify.get('/products/:productId/can-order', async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const { deliveryDate } = request.query as any;
      
      const requestedDate = deliveryDate ? new Date(deliveryDate) : undefined;
      const result = await advancedProductService.canOrderProduct(productId, requestedDate);
      
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Verifică starea de expirare a unui produs
  fastify.get('/products/:productId/expiry-status', async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const result = await advancedProductService.checkProductExpiry(productId);
      
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Calculează stocul disponibil
  fastify.get('/products/:productId/available-stock', async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const availableStock = await advancedProductService.calculateAvailableStock(productId);
      
      reply.send({ productId, availableStock });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Rezervă stoc (pentru utilizatori autentificați)
  fastify.post('/products/:productId/reserve-stock', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const { quantity, orderId } = request.body as any;
      
      if (!quantity || quantity <= 0) {
        return reply.code(400).send({ error: 'Valid quantity is required' });
      }

      await advancedProductService.reserveStock(productId, quantity, orderId);
      reply.send({ success: true, message: 'Stock reserved successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Eliberează stocul rezervat
  fastify.post('/products/:productId/release-stock', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const { quantity, orderId } = request.body as any;
      
      if (!quantity || quantity <= 0) {
        return reply.code(400).send({ error: 'Valid quantity is required' });
      }

      await advancedProductService.releaseReservedStock(productId, quantity, orderId);
      reply.send({ success: true, message: 'Reserved stock released successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Confirmă vânzarea
  fastify.post('/products/:productId/confirm-sale', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { productId } = request.params as any;
      const { quantity, orderId } = request.body as any;
      
      if (!quantity || quantity <= 0) {
        return reply.code(400).send({ error: 'Valid quantity is required' });
      }

      await advancedProductService.confirmSale(productId, quantity, orderId);
      reply.send({ success: true, message: 'Sale confirmed successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });
}