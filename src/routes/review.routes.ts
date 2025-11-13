import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma';

export async function reviewRoutes(fastify: FastifyInstance) {
  // Get reviews for a product
  fastify.get('/products/:productId/reviews', async (request, reply) => {
    try {
      const { productId } = request.params as any;
      
      // Try to get userId from token if present (but don't require it)
      let userId: string | undefined;
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (token) {
          const decoded = fastify.jwt.verify(token) as any;
          userId = decoded.userId;
        }
      } catch (err) {
        // Token invalid or missing, that's ok for public reviews
      }
      
      fastify.log.info({ productId, userId }, 'Fetching reviews for product');

      const reviews = await prisma.review.findMany({
        where: { dataItemId: productId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Mark reviews owned by current user
      const reviewsWithOwnership = reviews.map((review) => ({
        ...review,
        isOwner: userId ? userId === review.userId : false,
      }));
      
      fastify.log.info({ reviews: reviewsWithOwnership.map(r => ({ id: r.id, userId: r.userId, isOwner: r.isOwner })) }, 'Reviews with ownership');

      reply.send(reviewsWithOwnership);
    } catch (error) {
      fastify.log.error(error, 'Failed to get reviews');
      reply.code(500).send({ error: 'Failed to get reviews' });
    }
  });

  // Create review
  fastify.post('/reviews', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { dataItemId, rating, comment } = request.body as any;
      const userId = (request as any).user!.userId;
      
      fastify.log.info({ userId, dataItemId, rating }, 'Creating review');

      // Check if user already reviewed this product
      const existing = await prisma.review.findUnique({
        where: {
          userId_dataItemId: { userId, dataItemId },
        },
      });

      if (existing) {
        fastify.log.info('User already has a review for this product');
        return reply.code(400).send({ error: 'Ai deja o recenzie pentru acest produs' });
      }

      const review = await prisma.review.create({
        data: {
          userId,
          dataItemId,
          rating,
          comment,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      
      fastify.log.info({ reviewId: review.id }, 'Review created successfully');

      reply.code(201).send(review);
    } catch (error: any) {
      fastify.log.error(error, 'Failed to create review');
      reply.code(400).send({ error: error.message });
    }
  });

  // Update review
  fastify.put('/reviews/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { rating, comment } = request.body as any;
      const userId = (request as any).user!.userId;
      
      fastify.log.info({ id, userId, rating }, 'Updating review');

      // Check ownership
      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) {
        fastify.log.info({ reviewId: id }, 'Review not found (edit)');
        return reply.code(404).send({ error: 'Recenzia nu a fost găsită' });
      }
      
      if (review.userId !== userId) {
        fastify.log.info({ reviewUserId: review.userId, currentUserId: userId }, 'User does not own this review (edit)');
        return reply.code(403).send({ error: 'Nu ai permisiunea să editezi această recenzie' });
      }

      const updated = await prisma.review.update({
        where: { id },
        data: { rating, comment },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      
      fastify.log.info({ reviewId: id }, 'Review updated successfully');

      reply.send(updated);
    } catch (error: any) {
      fastify.log.error(error, 'Failed to update review');
      reply.code(400).send({ error: error.message });
    }
  });

  // Delete review
  fastify.delete('/reviews/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const userId = (request as any).user!.userId;
      
      fastify.log.info({ id, userId }, 'Deleting review');

      // Check ownership
      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) {
        fastify.log.info({ reviewId: id }, 'Review not found (delete)');
        return reply.code(404).send({ error: 'Recenzia nu a fost găsită' });
      }
      
      if (review.userId !== userId) {
        fastify.log.info({ reviewUserId: review.userId, currentUserId: userId }, 'User does not own this review (delete)');
        return reply.code(403).send({ error: 'Nu ai permisiunea să ștergi această recenzie' });
      }

      await prisma.review.delete({ where: { id } });
      fastify.log.info({ reviewId: id }, 'Review deleted successfully');
      
      reply.send({ message: 'Review deleted' });
    } catch (error: any) {
      fastify.log.error(error, 'Failed to delete review');
      reply.code(400).send({ error: error.message });
    }
  });
}
