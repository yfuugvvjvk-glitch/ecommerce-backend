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
}
