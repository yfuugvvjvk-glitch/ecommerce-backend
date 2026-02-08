import { FastifyInstance } from 'fastify';
import { PaymentService } from '../services/payment.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const paymentService = new PaymentService();

export async function paymentRoutes(fastify: FastifyInstance) {
  // Procesează plata
  fastify.post('/process', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { orderId, amount, cardData } = request.body as any;
      
      const result = await paymentService.processPayment(
        request.user!.userId,
        orderId,
        amount,
        cardData
      );
      
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Returnează banii (refund)
  fastify.post('/refund/:orderId', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { orderId } = request.params as any;
      const { reason } = request.body as any;
      
      const result = await paymentService.refundPayment(orderId, reason);
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Salvează cardul
  fastify.post('/save-card', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const cardData = request.body as any;
      
      const savedCard = await paymentService.saveCard(request.user!.userId, cardData);
      reply.send(savedCard);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Obține cardurile salvate
  fastify.get('/saved-cards', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const cards = await paymentService.getSavedCards(request.user!.userId);
      reply.send(cards);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to get saved cards' });
    }
  });

  // Obține istoricul tranzacțiilor
  fastify.get('/transactions', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const transactions = await paymentService.getTransactionHistory(request.user!.userId);
      reply.send(transactions);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to get transaction history' });
    }
  });

  // Admin: Generează carduri fictive
  fastify.post('/admin/generate-cards', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const cards = await paymentService.generateFictiveCards();
      reply.send({ message: 'Carduri fictive generate cu succes', cards });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Admin: Obține toate cardurile fictive
  fastify.get('/admin/fictive-cards', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const cards = await paymentService.getAllFictiveCards();
      reply.send(cards);
    } catch (error: any) {
      reply.code(500).send({ error: 'Failed to get fictive cards' });
    }
  });
}