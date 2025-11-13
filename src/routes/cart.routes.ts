import { FastifyInstance } from 'fastify';
import { CartService } from '../services/cart.service';
import { authMiddleware } from '../middleware/auth.middleware';

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
      const { dataItemId, quantity } = request.body as any;
      const cartItem = await cartService.addToCart(
        request.user!.userId,
        dataItemId,
        quantity || 1
      );
      reply.send(cartItem);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Update quantity
  fastify.put('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { quantity } = request.body as any;
      const cartItem = await cartService.updateQuantity(
        request.user!.userId,
        id,
        quantity
      );
      reply.send(cartItem);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
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
}
