"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRoutes = categoryRoutes;
const prisma_1 = require("../utils/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
async function categoryRoutes(fastify) {
    // Get all categories (public)
    fastify.get('/', async (request, reply) => {
        try {
            const categories = await prisma_1.prisma.category.findMany({
                include: {
                    _count: {
                        select: { dataItems: true },
                    },
                },
                orderBy: { name: 'asc' },
            });
            reply.send(categories);
        }
        catch (error) {
            console.error('Failed to get categories:', error);
            reply.code(500).send({ error: 'Failed to get categories' });
        }
    });
    // Create category (admin only)
    fastify.post('/', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const data = request.body;
            const category = await prisma_1.prisma.category.create({
                data,
            });
            reply.send(category);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Update category (admin only)
    fastify.put('/:id', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const category = await prisma_1.prisma.category.update({
                where: { id },
                data,
            });
            reply.send(category);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Delete category (admin only)
    fastify.delete('/:id', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { id } = request.params;
            // Check if category has products
            const productsCount = await prisma_1.prisma.dataItem.count({
                where: { categoryId: id },
            });
            if (productsCount > 0) {
                reply.code(400).send({
                    error: `Nu poți șterge această categorie deoarece are ${productsCount} produse asociate. Șterge sau mută produsele mai întâi.`
                });
                return;
            }
            await prisma_1.prisma.category.delete({ where: { id } });
            reply.send({ message: 'Category deleted' });
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
}
