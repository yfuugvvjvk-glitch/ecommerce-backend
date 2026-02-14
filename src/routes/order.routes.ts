import { FastifyInstance } from 'fastify';
import { OrderService } from '../services/order.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { CreateOrderSchema, UpdateOrderStatusSchema } from '../schemas/order.schema';

const orderService = new OrderService();

export async function orderRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      console.log('📥 Received order request:', JSON.stringify(request.body, null, 2));
      
      // Validate input with Zod
      const validatedData = CreateOrderSchema.parse(request.body);
      console.log('✅ Validation passed');
      
      const order = await orderService.createOrder(request.user!.userId, validatedData);
      reply.code(201).send(order);
    } catch (error: any) {
      console.error('❌ Order creation error:', error);
      
      if (error.name === 'ZodError') {
        console.error('📋 Validation errors:', JSON.stringify(error.errors, null, 2));
        reply.code(400).send({ 
          error: 'Validation failed', 
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      } else {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.get('/my', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const orders = await orderService.getMyOrders(request.user!.userId);
      reply.send(orders);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get orders' });
    }
  });

  fastify.get('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const order = await orderService.getOrderById(id, request.user!.userId);
      if (!order) {
        reply.code(404).send({ error: 'Order not found' });
        return;
      }
      reply.send(order);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get order' });
    }
  });

  // Admin routes - restaurate și funcționale
  fastify.get('/admin/all', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const { page = 1, limit = 100, status } = request.query as any;
      const result = await orderService.getAllOrders(parseInt(page), parseInt(limit), status);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get orders' });
    }
  });

  fastify.put('/admin/:id/status', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      
      console.log(`📝 Received status update request for order ${id}`);
      console.log(`📝 Request body:`, request.body);
      
      // Validate status with Zod
      const { status } = UpdateOrderStatusSchema.parse(request.body);
      
      console.log(`📝 Validated status: ${status}`);
      
      const order = await orderService.updateOrderStatus(id, status);
      reply.send(order);
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

  fastify.get('/admin/stats', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const stats = await orderService.getOrderStats();
      reply.send(stats);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get order stats' });
    }
  });
}
