import { FastifyInstance } from 'fastify';
import { VoucherService } from '../services/voucher.service';
import { authMiddleware } from '../middleware/auth.middleware';

const voucherService = new VoucherService();

export async function voucherRoutes(fastify: FastifyInstance) {
  fastify.post('/validate', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { code, cartTotal } = request.body as any;
      const result = await voucherService.validateVoucher(code, cartTotal);
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.get('/active', async (request, reply) => {
    try {
      const vouchers = await voucherService.getAllVouchers();
      reply.send(vouchers.filter(v => v.isActive));
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get vouchers' });
    }
  });

  // Get user's vouchers
  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const vouchers = await voucherService.getUserVouchers(request.user!.userId);
      reply.send(vouchers);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get vouchers' });
    }
  });

  // Request voucher
  fastify.post('/request', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { code, discountType, discountValue, minPurchase, validUntil, description } = request.body as any;
      
      // Validate required fields
      if (!code || !discountType || !discountValue) {
        return reply.code(400).send({ error: 'Cod, tip reducere și valoare sunt obligatorii' });
      }
      
      const voucherRequest = await voucherService.createVoucherRequest(
        request.user!.userId,
        {
          code: code.toUpperCase(),
          discountType,
          discountValue: parseFloat(discountValue),
          minPurchase: minPurchase ? parseFloat(minPurchase) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          description: description || '',
        }
      );
      reply.code(201).send(voucherRequest);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Get user's voucher requests
  fastify.get('/my-requests', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const requests = await voucherService.getUserVoucherRequests(request.user!.userId);
      reply.send(requests);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get voucher requests' });
    }
  });

  // Update user's voucher request
  fastify.put('/my-requests/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const updated = await voucherService.updateUserVoucherRequest(
        id,
        request.user!.userId,
        data
      );
      reply.send(updated);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Delete user's voucher request
  fastify.delete('/my-requests/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await voucherService.deleteUserVoucherRequest(id, request.user!.userId);
      reply.send({ message: 'Voucher request deleted' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}
