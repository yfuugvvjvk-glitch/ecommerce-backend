import { FastifyInstance } from 'fastify';
import { TestCardService } from '../services/test-card.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const testCardService = new TestCardService();

export async function testCardRoutes(fastify: FastifyInstance) {
  // ADMIN ROUTES - Doar pentru administratori

  // Creează card de test
  fastify.post('/admin/create', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const cardData = request.body as any;
      const card = await testCardService.createTestCard(request.user!.userId, cardData);
      reply.send(card);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Obține toate cardurile de test
  fastify.get('/admin/all', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const cards = await testCardService.getAllTestCards(request.user!.userId);
      reply.send(cards);
    } catch (error: any) {
      reply.code(403).send({ error: error.message });
    }
  });

  // Actualizează card de test
  fastify.put('/admin/:cardId', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const { cardId } = request.params as any;
      const updateData = request.body as any;
      const card = await testCardService.updateTestCard(request.user!.userId, cardId, updateData);
      reply.send(card);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Șterge card de test
  fastify.delete('/admin/:cardId', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const { cardId } = request.params as any;
      await testCardService.deleteTestCard(request.user!.userId, cardId);
      reply.send({ message: 'Card de test șters cu succes' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Generează carduri de test predefinite
  fastify.post('/admin/generate-defaults', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const cards = await testCardService.generateDefaultTestCards(request.user!.userId);
      reply.send({ message: 'Carduri de test generate cu succes', cards });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Procesează plata cu card de test (pentru checkout)
  fastify.post('/process-payment', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const paymentData = request.body as any;
      const result = await testCardService.processTestCardPayment(request.user!.userId, paymentData.orderId, paymentData);
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Validează un card de test (pentru checkout)
  fastify.post('/validate', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { cardNumber, cvv, expiryMonth, expiryYear } = request.body as any;
      const validation = await testCardService.validateTestCard(cardNumber, cvv, expiryMonth, expiryYear);
      reply.send(validation);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}