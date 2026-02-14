import { FastifyInstance } from 'fastify';
import { CartService } from '../services/cart.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { AddToCartSchema, UpdateCartQuantitySchema } from '../schemas/cart.schema';

const cartService = new CartService();

export async function cartRoutes(fastify: FastifyInstance) {
  // Get cart
  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const cart = await cartService.getCart(request.user!.userId);
      reply.send(cart);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get cart' });
    }
  });

  // Add to cart
  fastify.post('/', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      // Validate input with Zod
      const { dataItemId, quantity } = AddToCartSchema.parse(request.body);
      const cartItem = await cartService.addToCart(
        request.user!.userId,
        dataItemId,
        quantity
      );
      reply.send(cartItem);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        reply.code(400).send({ 
          error: 'Validation failed', 
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      } else {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  // Update quantity
  fastify.put('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      
      // Validate quantity with Zod
      const { quantity } = UpdateCartQuantitySchema.parse(request.body);
      const cartItem = await cartService.updateQuantity(
        request.user!.userId,
        id,
        quantity
      );
      reply.send(cartItem);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        reply.code(400).send({ 
          error: 'Validation failed', 
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      } else {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  // Remove from cart
  fastify.delete('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await cartService.removeFromCart(request.user!.userId, id);
      reply.send({ message: 'Item removed from cart' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Clear cart
  fastify.delete('/', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      await cartService.clearCart(request.user!.userId);
      reply.send({ message: 'Cart cleared' });
    } catch (error) {
      reply.code(500).send({ error: 'Failed to clear cart' });
    }
  });

  // ============================================
  // GIFT SYSTEM ENDPOINTS
  // ============================================

  // Evaluate gift rules for current cart
  fastify.post('/evaluate-gift-rules', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const eligibleRules = await cartService.getEligibleGifts(request.user!.userId);
      
      reply.send({
        success: true,
        eligibleRules,
      });
    } catch (error: any) {
      console.error('Error evaluating gift rules:', error);
      reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to evaluate gift rules',
        },
      });
    }
  });

  // Add gift product to cart
  fastify.post('/add-gift-product', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      console.log('🎁 Add gift product request:', request.body);
      
      const { giftRuleId, productId } = request.body as {
        giftRuleId: string;
        productId: string;
      };

      if (!giftRuleId || !productId) {
        console.log('❌ Missing parameters:', { giftRuleId, productId });
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'giftRuleId and productId are required',
          },
        });
      }

      console.log('👤 User:', request.user);
      
      const result = await cartService.addGiftProduct(
        request.user!.userId,
        giftRuleId,
        productId
      );

      console.log('✅ Gift product added successfully');
      reply.send(result);
    } catch (error: any) {
      console.error('❌ Error adding gift product:', error.message);
      console.error('Stack:', error.stack);
      
      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('out of stock') ? 409 :
                        error.message.includes('already') ? 400 : 400;

      reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' :
                statusCode === 409 ? 'OUT_OF_STOCK' :
                'INVALID_REQUEST',
          message: error.message || 'Failed to add gift product',
        },
      });
    }
  });

  // Remove gift product from cart
  fastify.delete('/gift-product/:cartItemId', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { cartItemId } = request.params as { cartItemId: string };

      const result = await cartService.removeGiftProduct(
        request.user!.userId,
        cartItemId
      );

      reply.send(result);
    } catch (error: any) {
      console.error('Error removing gift product:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;

      reply.code(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: error.message || 'Failed to remove gift product',
        },
      });
    }
  });

  // Reevaluate gifts (manual trigger)
  fastify.post('/reevaluate-gifts', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const result = await cartService.reevaluateGifts(request.user!.userId);

      reply.send({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('Error reevaluating gifts:', error);
      reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to reevaluate gifts',
        },
      });
    }
  });
}
