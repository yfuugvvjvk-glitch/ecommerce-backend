import { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

export async function categoryRoutes(fastify: FastifyInstance) {
  // Get all categories (public)
  fastify.get('/', async (request, reply) => {
    try {
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { dataItems: true },
          },
        },
        orderBy: { name: 'asc' },
      });
      reply.send(categories);
    } catch (error) {
      console.error('Failed to get categories:', error);
      reply.code(500).send({ error: 'Failed to get categories' });
    }
  });

  // Create category (admin only)
  fastify.post('/', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const data = request.body as any;
      const category = await prisma.category.create({
        data,
      });
      reply.send(category);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Update category (admin only)
  fastify.put('/:id', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const category = await prisma.category.update({
        where: { id },
        data,
      });
      reply.send(category);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Delete category (admin only)
  fastify.delete('/:id', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      
      // Check if category has products
      const productsCount = await prisma.dataItem.count({
        where: { categoryId: id },
      });
      
      if (productsCount > 0) {
        reply.code(400).send({ 
          error: `Nu poți șterge această categorie deoarece are ${productsCount} produse asociate. Șterge sau mută produsele mai întâi.` 
        });
        return;
      }
      
      await prisma.category.delete({ where: { id } });
      reply.send({ message: 'Category deleted' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}
