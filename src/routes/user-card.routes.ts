import { FastifyInstance } from 'fastify';
import { userCardService } from '../services/user-card.service';
import { authMiddleware } from '../middleware/auth.middleware';

export async function userCardRoutes(fastify: FastifyInstance) {

  // Obține cardurile utilizatorului
  fastify.get('/my-cards', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const cards = await userCardService.getUserCards(request.user!.userId);
      reply.send(cards);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Adaugă un card real
  fastify.post('/add-real-card', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const cardData = request.body as any;
      const newCard = await userCardService.addRealCard(request.user!.userId, cardData);
      reply.code(201).send(newCard);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge un card
  fastify.delete('/cards/:cardId', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { cardId } = request.params as any;
      const result = await userCardService.deleteCard(request.user!.userId, cardId);
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Setează cardul default
  fastify.put('/cards/:cardId/default', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { cardId } = request.params as any;
      const result = await userCardService.setDefaultCard(request.user!.userId, cardId);
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Procesează plata
  fastify.post('/process-payment', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const paymentData = request.body as any;
      const result = await userCardService.processPayment(request.user!.userId, paymentData);
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Obține istoricul tranzacțiilor
  fastify.get('/transactions', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const transactions = await userCardService.getTransactionHistory(request.user!.userId);
      reply.send(transactions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });
}