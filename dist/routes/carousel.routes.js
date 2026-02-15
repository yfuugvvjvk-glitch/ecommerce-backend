"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carouselRoutes = carouselRoutes;
const auth_middleware_1 = require("../middleware/auth.middleware");
const carousel_service_1 = require("../services/carousel.service");
// Middleware pentru verificarea rolului de admin
const adminMiddleware = async (request, reply) => {
    if (request.user?.role !== 'admin') {
        return reply.code(403).send({ error: 'Access denied. Admin role required.' });
    }
};
async function carouselRoutes(fastify) {
    // === RUTE PUBLICE (fără middleware) ===
    // Obține item-urile active din carousel (pentru afișare publică)
    fastify.get('/active', async (request, reply) => {
        try {
            const items = await carousel_service_1.carouselService.getActiveCarouselItems();
            reply.send(items);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține toate item-urile din carousel (public - pentru dashboard)
    fastify.get('/', async (request, reply) => {
        try {
            // Pentru utilizatori neautentificați sau non-admin, returnează doar item-urile active
            const items = await carousel_service_1.carouselService.getActiveCarouselItems();
            reply.send(items);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // === RUTE ADMIN (cu middleware aplicat individual) ===
    // === RUTE ADMIN (cu middleware aplicat individual) ===
    // Obține toate pozițiile disponibile
    fastify.get('/positions', { preHandler: [auth_middleware_1.authMiddleware, adminMiddleware] }, async (request, reply) => {
        try {
            const positions = await carousel_service_1.carouselService.getAvailablePositions();
            reply.send(positions);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține toate item-urile din carousel (admin - cu inactive)
    fastify.get('/all', { preHandler: [auth_middleware_1.authMiddleware, adminMiddleware] }, async (request, reply) => {
        try {
            const { includeInactive } = request.query;
            const items = await carousel_service_1.carouselService.getAllCarouselItems(includeInactive === 'true');
            reply.send(items);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Obține un item specific
    fastify.get('/:id', { preHandler: [auth_middleware_1.authMiddleware, adminMiddleware] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const item = await carousel_service_1.carouselService.getCarouselItemById(id);
            reply.send(item);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(404).send({ error: errorMessage });
        }
    });
    // Creează un nou item în carousel
    fastify.post('/', { preHandler: [auth_middleware_1.authMiddleware, adminMiddleware] }, async (request, reply) => {
        try {
            const data = request.body;
            const userId = request.user.userId;
            const item = await carousel_service_1.carouselService.createCarouselItem(data, userId);
            reply.code(201).send(item);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Actualizează un item din carousel
    fastify.put('/:id', { preHandler: [auth_middleware_1.authMiddleware, adminMiddleware] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const item = await carousel_service_1.carouselService.updateCarouselItem(id, data);
            reply.send(item);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge un item din carousel
    fastify.delete('/:id', { preHandler: [auth_middleware_1.authMiddleware, adminMiddleware] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const result = await carousel_service_1.carouselService.deleteCarouselItem(id);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Schimbă pozițiile a două item-uri
    fastify.post('/swap', { preHandler: [auth_middleware_1.authMiddleware, adminMiddleware] }, async (request, reply) => {
        try {
            const { itemId1, itemId2 } = request.body;
            if (!itemId1 || !itemId2) {
                return reply.code(400).send({ error: 'Both item IDs are required' });
            }
            const result = await carousel_service_1.carouselService.swapPositions(itemId1, itemId2);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Mută un item la o nouă poziție
    fastify.post('/:id/move', { preHandler: [auth_middleware_1.authMiddleware, adminMiddleware] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { position } = request.body;
            if (!position || position < 1 || position > 10) {
                return reply.code(400).send({ error: 'Position must be between 1 and 10' });
            }
            const item = await carousel_service_1.carouselService.moveToPosition(id, position);
            reply.send(item);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Obține statistici despre carousel
    fastify.get('/stats/overview', { preHandler: [auth_middleware_1.authMiddleware, adminMiddleware] }, async (request, reply) => {
        try {
            const stats = await carousel_service_1.carouselService.getCarouselStats();
            reply.send(stats);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
}
