import { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

export async function categoryRoutes(fastify: FastifyInstance) {
  // Get all categories with hierarchy (public + admin)
  fastify.get('/', async (request, reply) => {
    try {
      const { includeSubcategories, showAll } = request.query as any;
      
      // Determină filtrul pentru isActive (admin vede toate, public doar active)
      const activeFilter = showAll === 'true' ? {} : { isActive: true };
      
      // Dacă se cere ierarhia completă
      if (includeSubcategories === 'true') {
        const categories = await prisma.category.findMany({
          where: { parentId: null, ...activeFilter }, // Doar categoriile principale
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            description: true,
            position: true,
            isActive: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
            subcategories: {
              where: activeFilter,
              select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
                description: true,
                position: true,
                isActive: true,
                parentId: true,
                _count: {
                  select: { 
                    dataItems: {
                      where: { status: 'published' }
                    }
                  },
                },
              },
              orderBy: { position: 'asc' },
            },
            _count: {
              select: { 
                dataItems: {
                  where: { status: 'published' }
                }
              },
            },
          },
          orderBy: { position: 'asc' },
        });
        reply.send(categories);
      } else {
        // Toate categoriile (flat)
        const categories = await prisma.category.findMany({
          where: activeFilter,
          include: {
            _count: {
              select: { 
                dataItems: {
                  where: { status: 'published' }
                }
              },
            },
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
        });
        reply.send(categories);
      }
    } catch (error) {
      console.error('Failed to get categories:', error);
      reply.code(500).send({ error: 'Failed to get categories' });
    }
  });

  // Get single category with subcategories
  fastify.get('/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as any;
      
      const category = await prisma.category.findUnique({
        where: { slug },
        include: {
          subcategories: {
            where: { isActive: true },
            include: {
              _count: {
                select: { 
                  dataItems: {
                    where: { status: 'published' }
                  }
                },
              },
            },
            orderBy: { position: 'asc' },
          },
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
          _count: {
            select: { 
              dataItems: {
                where: { status: 'published' }
              }
            },
          },
        },
      });

      if (!category) {
        reply.code(404).send({ error: 'Category not found' });
        return;
      }

      reply.send(category);
    } catch (error) {
      console.error('Failed to get category:', error);
      reply.code(500).send({ error: 'Failed to get category' });
    }
  });

  // Create category (admin only)
  fastify.post('/', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
    try {
      const data = request.body as any;
      
      // Validare: nu permite parentId să fie același cu id-ul categoriei
      if (data.parentId === '') {
        data.parentId = null;
      }
      
      const category = await prisma.category.create({
        data: {
          name: data.name,
          slug: data.slug,
          nameRo: data.nameRo,
          nameEn: data.nameEn,
          description: data.description,
          icon: data.icon,
          parentId: data.parentId || null,
          position: data.position || 0,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
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
      
      // Validare: nu permite ca o categorie să fie propriul părinte
      if (data.parentId === id) {
        reply.code(400).send({ error: 'O categorie nu poate fi propriul părinte' });
        return;
      }
      
      // Validare: nu permite parentId gol string
      if (data.parentId === '') {
        data.parentId = null;
      }
      
      const category = await prisma.category.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          nameRo: data.nameRo,
          nameEn: data.nameEn,
          description: data.description,
          icon: data.icon,
          parentId: data.parentId || null,
          position: data.position,
          isActive: data.isActive,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
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
      
      // Check if category has subcategories
      const subcategoriesCount = await prisma.category.count({
        where: { parentId: id },
      });
      
      if (subcategoriesCount > 0) {
        reply.code(400).send({ 
          error: `Nu poți șterge această categorie deoarece are ${subcategoriesCount} subcategorii. Șterge sau mută subcategoriile mai întâi.` 
        });
        return;
      }
      
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
      reply.send({ message: 'Category deleted successfully' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}
