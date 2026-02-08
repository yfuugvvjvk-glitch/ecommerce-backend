"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRoutes = orderRoutes;
const order_service_1 = require("../services/order.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const order_schema_1 = require("../schemas/order.schema");
const orderService = new order_service_1.OrderService();
async function orderRoutes(fastify) {
    fastify.post('/', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            // Validate input with Zod
            const validatedData = order_schema_1.CreateOrderSchema.parse(request.body);
            const order = await orderService.createOrder(request.user.userId, validatedData);
            reply.code(201).send(order);
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
    fastify.get('/my', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const orders = await orderService.getMyOrders(request.user.userId);
            reply.send(orders);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get orders' });
        }
    });
    fastify.get('/:id', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            const order = await orderService.getOrderById(id, request.user.userId);
            if (!order) {
                reply.code(404).send({ error: 'Order not found' });
                return;
            }
            reply.send(order);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get order' });
        }
    });
    // Admin routes - restaurate și funcționale
    fastify.get('/admin/all', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { page = 1, limit = 20, status } = request.query;
            const result = await orderService.getAllOrders(parseInt(page), parseInt(limit), status);
            reply.send(result);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get orders' });
        }
    });
    fastify.put('/admin/:id/status', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { id } = request.params;
            // Validate status with Zod
            const { status } = order_schema_1.UpdateOrderStatusSchema.parse(request.body);
            const order = await orderService.updateOrderStatus(id, status);
            reply.send(order);
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
    fastify.get('/admin/stats', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const stats = await orderService.getOrderStats();
            reply.send(stats);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get order stats' });
        }
    });
}
