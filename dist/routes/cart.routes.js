"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRoutes = cartRoutes;
const cart_service_1 = require("../services/cart.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const cart_schema_1 = require("../schemas/cart.schema");
const cartService = new cart_service_1.CartService();
async function cartRoutes(fastify) {
    // Get cart
    fastify.get('/', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const cart = await cartService.getCart(request.user.userId);
            reply.send(cart);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get cart' });
        }
    });
    // Add to cart
    fastify.post('/', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            // Validate input with Zod
            const { dataItemId, quantity } = cart_schema_1.AddToCartSchema.parse(request.body);
            const cartItem = await cartService.addToCart(request.user.userId, dataItemId, quantity);
            reply.send(cartItem);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                reply.code(400).send({
                    error: 'Validation failed',
                    details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
                });
            }
            else {
                reply.code(400).send({ error: error.message });
            }
        }
    });
    // Update quantity
    fastify.put('/:id', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            // Validate quantity with Zod
            const { quantity } = cart_schema_1.UpdateCartQuantitySchema.parse(request.body);
            const cartItem = await cartService.updateQuantity(request.user.userId, id, quantity);
            reply.send(cartItem);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                reply.code(400).send({
                    error: 'Validation failed',
                    details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
                });
            }
            else {
                reply.code(400).send({ error: error.message });
            }
        }
    });
    // Remove from cart
    fastify.delete('/:id', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            await cartService.removeFromCart(request.user.userId, id);
            reply.send({ message: 'Item removed from cart' });
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Clear cart
    fastify.delete('/', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            await cartService.clearCart(request.user.userId);
            reply.send({ message: 'Cart cleared' });
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to clear cart' });
        }
    });
    // ============================================
    // GIFT SYSTEM ENDPOINTS
    // ============================================
    // Evaluate gift rules for current cart
    fastify.post('/evaluate-gift-rules', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const eligibleRules = await cartService.getEligibleGifts(request.user.userId);
            reply.send({
                success: true,
                eligibleRules,
            });
        }
        catch (error) {
            console.error('Error evaluating gift rules:', error);
            reply.code(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message || 'Failed to evaluate gift rules',
                },
            });
        }
    });
    // Add gift product to cart
    fastify.post('/add-gift-product', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            console.log('🎁 Add gift product request:', request.body);
            const { giftRuleId, productId } = request.body;
            if (!giftRuleId || !productId) {
                console.log('❌ Missing parameters:', { giftRuleId, productId });
                return reply.code(400).send({
                    success: false,
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'giftRuleId and productId are required',
                    },
                });
            }
            console.log('👤 User:', request.user);
            const result = await cartService.addGiftProduct(request.user.userId, giftRuleId, productId);
            console.log('✅ Gift product added successfully');
            reply.send(result);
        }
        catch (error) {
            console.error('❌ Error adding gift product:', error.message);
            console.error('Stack:', error.stack);
            const statusCode = error.message.includes('not found') ? 404 :
                error.message.includes('out of stock') ? 409 :
                    error.message.includes('already') ? 400 : 400;
            reply.code(statusCode).send({
                success: false,
                error: {
                    code: statusCode === 404 ? 'NOT_FOUND' :
                        statusCode === 409 ? 'OUT_OF_STOCK' :
                            'INVALID_REQUEST',
                    message: error.message || 'Failed to add gift product',
                },
            });
        }
    });
    // Remove gift product from cart
    fastify.delete('/gift-product/:cartItemId', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { cartItemId } = request.params;
            const result = await cartService.removeGiftProduct(request.user.userId, cartItemId);
            reply.send(result);
        }
        catch (error) {
            console.error('Error removing gift product:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            reply.code(statusCode).send({
                success: false,
                error: {
                    code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
                    message: error.message || 'Failed to remove gift product',
                },
            });
        }
    });
    // Reevaluate gifts (manual trigger)
    fastify.post('/reevaluate-gifts', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const result = await cartService.reevaluateGifts(request.user.userId);
            reply.send({
                success: true,
                ...result,
            });
        }
        catch (error) {
            console.error('Error reevaluating gifts:', error);
            reply.code(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message || 'Failed to reevaluate gifts',
                },
            });
        }
    });
}
