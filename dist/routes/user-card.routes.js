"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCardRoutes = userCardRoutes;
const user_card_service_1 = require("../services/user-card.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
async function userCardRoutes(fastify) {
    // Obține cardurile utilizatorului
    fastify.get('/my-cards', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const cards = await user_card_service_1.userCardService.getUserCards(request.user.userId);
            reply.send(cards);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Adaugă un card real
    fastify.post('/add-real-card', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const cardData = request.body;
            const newCard = await user_card_service_1.userCardService.addRealCard(request.user.userId, cardData);
            reply.code(201).send(newCard);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge un card
    fastify.delete('/cards/:cardId', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { cardId } = request.params;
            const result = await user_card_service_1.userCardService.deleteCard(request.user.userId, cardId);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Setează cardul default
    fastify.put('/cards/:cardId/default', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { cardId } = request.params;
            const result = await user_card_service_1.userCardService.setDefaultCard(request.user.userId, cardId);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Procesează plata
    fastify.post('/process-payment', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const paymentData = request.body;
            const result = await user_card_service_1.userCardService.processPayment(request.user.userId, paymentData);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Obține istoricul tranzacțiilor
    fastify.get('/transactions', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const transactions = await user_card_service_1.userCardService.getTransactionHistory(request.user.userId);
            reply.send(transactions);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
}
