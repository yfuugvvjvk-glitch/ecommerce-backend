import { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma';

export async function offerRoutes(fastify: FastifyInstance) {
  // Get all active offers (public)
  fastify.get('/', async (request, reply) => {
    try {
      const offers = await prisma.offer.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
      });
      reply.send(offers);
    } catch (error) {
      console.error('Failed to get offers:', error);
      reply.code(500).send({ error: 'Failed to get offers' });
    }
  });

  // Get products for a specific offer
  fastify.get('/:id/products', async (request, reply) => {
    try {
      const { id } = request.params as any;
      
      console.log('Fetching products for offer:', id);
      
      // Get offer with products
      const offer = await prisma.offer.findUnique({
        where: { id },
        include: {
          products: {
            include: {
              dataItem: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      if (!offer) {
        console.log('Offer not found:', id);
        return reply.code(404).send({ error: 'Offer not found' });
      }

      console.log('Offer found:', offer.title);
      console.log('Number of linked products:', offer.products.length);

      // If no specific products, return all products with matching discount
      if (offer.products.length === 0) {
        console.log('No specific products, searching by discount:', offer.discount);
        const allProducts = await prisma.dataItem.findMany({
          where: {
            status: 'published',
          },
          include: {
            category: true,
          },
        });
        
        console.log('Total published products:', allProducts.length);
        
        // Filter products that have oldPrice and match the discount
        const productsWithDiscount = allProducts.filter(product => {
          if (!product.oldPrice || product.oldPrice <= product.price) return false;
          const discount = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
          return discount === Math.round(offer.discount);
        });

        console.log('Products matching discount:', productsWithDiscount.length);

        return reply.send({
          offer,
          products: productsWithDiscount,
        });
      }

      // Return specific products
      console.log('Returning specific products:', offer.products.length);
      reply.send({
        offer,
        products: offer.products.map(p => p.dataItem),
      });
    } catch (error) {
      console.error('Failed to get offer products:', error);
      reply.code(500).send({ error: 'Failed to get offer products' });
    }
  });
}
