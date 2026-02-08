"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRoutes = paymentRoutes;
const payment_service_1 = require("../services/payment.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const paymentService = new payment_service_1.PaymentService();
async function paymentRoutes(fastify) {
    // Procesează plata
    fastify.post('/process', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { orderId, amount, cardData } = request.body;
            const result = await paymentService.processPayment(request.user.userId, orderId, amount, cardData);
            reply.send(result);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Returnează banii (refund)
    fastify.post('/refund/:orderId', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { orderId } = request.params;
            const { reason } = request.body;
            const result = await paymentService.refundPayment(orderId, reason);
            reply.send(result);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Salvează cardul
    fastify.post('/save-card', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const cardData = request.body;
            const savedCard = await paymentService.saveCard(request.user.userId, cardData);
            reply.send(savedCard);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Obține cardurile salvate
    fastify.get('/saved-cards', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const cards = await paymentService.getSavedCards(request.user.userId);
            reply.send(cards);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get saved cards' });
        }
    });
    // Obține istoricul tranzacțiilor
    fastify.get('/transactions', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const transactions = await paymentService.getTransactionHistory(request.user.userId);
            reply.send(transactions);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get transaction history' });
        }
    });
    // Admin: Generează carduri fictive
    fastify.post('/admin/generate-cards', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const cards = await paymentService.generateFictiveCards();
            reply.send({ message: 'Carduri fictive generate cu succes', cards });
        }
        catch (error) {
            reply.code(500).send({ error: error.message });
        }
    });
    // Admin: Obține toate cardurile fictive
    fastify.get('/admin/fictive-cards', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const cards = await paymentService.getAllFictiveCards();
            reply.send(cards);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get fictive cards' });
        }
    });
}
