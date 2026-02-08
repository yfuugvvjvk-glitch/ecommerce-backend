"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCardRoutes = testCardRoutes;
const test_card_service_1 = require("../services/test-card.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const testCardService = new test_card_service_1.TestCardService();
async function testCardRoutes(fastify) {
    // ADMIN ROUTES - Doar pentru administratori
    // Creează card de test
    fastify.post('/admin/create', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const cardData = request.body;
            const card = await testCardService.createTestCard(request.user.userId, cardData);
            reply.send(card);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Obține toate cardurile de test
    fastify.get('/admin/all', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const cards = await testCardService.getAllTestCards(request.user.userId);
            reply.send(cards);
        }
        catch (error) {
            reply.code(403).send({ error: error.message });
        }
    });
    // Actualizează card de test
    fastify.put('/admin/:cardId', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { cardId } = request.params;
            const updateData = request.body;
            const card = await testCardService.updateTestCard(request.user.userId, cardId, updateData);
            reply.send(card);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Șterge card de test
    fastify.delete('/admin/:cardId', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { cardId } = request.params;
            await testCardService.deleteTestCard(request.user.userId, cardId);
            reply.send({ message: 'Card de test șters cu succes' });
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Generează carduri de test predefinite
    fastify.post('/admin/generate-defaults', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const cards = await testCardService.generateDefaultTestCards(request.user.userId);
            reply.send({ message: 'Carduri de test generate cu succes', cards });
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Procesează plata cu card de test (pentru checkout)
    fastify.post('/process-payment', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const paymentData = request.body;
            const result = await testCardService.processTestCardPayment(request.user.userId, paymentData.orderId, paymentData);
            reply.send(result);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Validează un card de test (pentru checkout)
    fastify.post('/validate', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { cardNumber, cvv, expiryMonth, expiryYear } = request.body;
            const validation = await testCardService.validateTestCard(cardNumber, cvv, expiryMonth, expiryYear);
            reply.send(validation);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
}
