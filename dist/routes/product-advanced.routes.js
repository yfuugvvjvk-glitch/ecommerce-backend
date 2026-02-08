"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productAdvancedRoutes = productAdvancedRoutes;
const auth_middleware_1 = require("../middleware/auth.middleware");
const advanced_product_service_1 = require("../services/advanced-product.service");
async function productAdvancedRoutes(fastify) {
    // Verifică dacă un produs poate fi comandat
    fastify.get('/products/:productId/can-order', async (request, reply) => {
        try {
            const { productId } = request.params;
            const { deliveryDate } = request.query;
            const requestedDate = deliveryDate ? new Date(deliveryDate) : undefined;
            const result = await advanced_product_service_1.advancedProductService.canOrderProduct(productId, requestedDate);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Verifică starea de expirare a unui produs
    fastify.get('/products/:productId/expiry-status', async (request, reply) => {
        try {
            const { productId } = request.params;
            const result = await advanced_product_service_1.advancedProductService.checkProductExpiry(productId);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Calculează stocul disponibil
    fastify.get('/products/:productId/available-stock', async (request, reply) => {
        try {
            const { productId } = request.params;
            const availableStock = await advanced_product_service_1.advancedProductService.calculateAvailableStock(productId);
            reply.send({ productId, availableStock });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Rezervă stoc (pentru utilizatori autentificați)
    fastify.post('/products/:productId/reserve-stock', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { productId } = request.params;
            const { quantity, orderId } = request.body;
            if (!quantity || quantity <= 0) {
                return reply.code(400).send({ error: 'Valid quantity is required' });
            }
            await advanced_product_service_1.advancedProductService.reserveStock(productId, quantity, orderId);
            reply.send({ success: true, message: 'Stock reserved successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Eliberează stocul rezervat
    fastify.post('/products/:productId/release-stock', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { productId } = request.params;
            const { quantity, orderId } = request.body;
            if (!quantity || quantity <= 0) {
                return reply.code(400).send({ error: 'Valid quantity is required' });
            }
            await advanced_product_service_1.advancedProductService.releaseReservedStock(productId, quantity, orderId);
            reply.send({ success: true, message: 'Reserved stock released successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Confirmă vânzarea
    fastify.post('/products/:productId/confirm-sale', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { productId } = request.params;
            const { quantity, orderId } = request.body;
            if (!quantity || quantity <= 0) {
                return reply.code(400).send({ error: 'Valid quantity is required' });
            }
            await advanced_product_service_1.advancedProductService.confirmSale(productId, quantity, orderId);
            reply.send({ success: true, message: 'Sale confirmed successfully' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
}
