import { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { UserService } from '../services/user.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadAvatar } from '../middleware/upload.middleware';

const userService = new UserService();

// Validation schemas
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Parola curentă este obligatorie'),
  newPassword: z.string().min(6, 'Parola nouă trebuie să conțină cel puțin 6 caractere'),
});

export async function userRoutes(fastify: FastifyInstance) {
  // Profile
  fastify.get('/profile', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const profile = await userService.getProfile(request.user!.userId);
      reply.send(profile);
    } catch (error: any) {
      reply.code(404).send({ error: error.message });
    }
  });

  fastify.put('/profile', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const data = request.body as any;
      const profile = await userService.updateProfile(request.user!.userId, data);
      reply.send(profile);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Avatar upload
  fastify.post('/avatar', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const uploadedFile = await uploadAvatar(request, reply);
      const profile = await userService.uploadAvatar(request.user!.userId, uploadedFile.url);
      reply.send({
        message: 'Avatar uploaded successfully',
        avatar: uploadedFile.url,
        profile,
      });
    } catch (error: any) {
      if (!reply.sent) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.delete('/avatar', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const profile = await userService.deleteAvatar(request.user!.userId);
      reply.send({
        message: 'Avatar deleted successfully',
        profile,
      });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Update locale
  fastify.put('/locale', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { locale } = request.body as any;
      if (!locale || !['ro', 'en'].includes(locale)) {
        reply.code(400).send({ error: 'Invalid locale. Must be "ro" or "en"' });
        return;
      }
      const profile = await userService.updateLocale(request.user!.userId, locale);
      reply.send(profile);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  /**
   * POST /api/user/change-password
   * Change user password with notification
   * 
   * Validates current password, updates to new password, and sends
   * notification email with timestamp, IP address, and device info.
   * 
   * Requirements:
   * - 3.1: Send notification to current email address
   * - 3.2: Include date and time of change
   * - 3.3: Include IP address
   * - 3.4: Include device information
   * - 3.5: Include "If this wasn't you" warning
   */
  fastify.post('/change-password', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const body = ChangePasswordSchema.parse(request.body);
      
      // Extract IP address from request
      const ipAddress = request.headers['x-forwarded-for'] as string || 
                       request.headers['x-real-ip'] as string ||
                       request.ip || 
                       'IP necunoscut';
      
      // Extract user agent
      const userAgent = request.headers['user-agent'] || 'User agent necunoscut';
      
      const result = await userService.changePassword(
        request.user!.userId,
        body.currentPassword,
        body.newPassword,
        ipAddress,
        userAgent
      );
      
      return reply.status(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Eroare de validare',
          details: error.issues.map(issue => issue.message),
        });
      }

      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }

      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'A apărut o eroare la schimbarea parolei. Vă rugăm să încercați din nou.',
      });
    }
  });

  // Favorites
  fastify.get('/favorites', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const favorites = await userService.getFavorites(request.user!.userId);
      reply.send(favorites);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get favorites' });
    }
  });

  fastify.get('/favorites/check/:dataItemId', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { dataItemId } = request.params as any;
      const isFavorite = await userService.checkFavorite(request.user!.userId, dataItemId);
      reply.send({ isFavorite });
    } catch (error) {
      reply.code(500).send({ error: 'Failed to check favorite' });
    }
  });

  fastify.post('/favorites', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { dataItemId } = request.body as any;
      if (!dataItemId) {
        return reply.code(400).send({ error: 'dataItemId is required' });
      }
      const favorite = await userService.addFavorite(request.user!.userId, dataItemId);
      reply.send(favorite);
    } catch (error: any) {
      console.error('Add favorite error:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.delete('/favorites/:dataItemId', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { dataItemId } = request.params as any;
      const userId = request.user!.userId;
      console.log('Removing favorite:', { userId, dataItemId });
      await userService.removeFavorite(userId, dataItemId);
      reply.send({ message: 'Removed from favorites' });
    } catch (error: any) {
      console.error('Remove favorite error:', error);
      reply.code(400).send({ error: error.message || 'Failed to remove favorite' });
    }
  });

  // Reviews
  fastify.get('/reviews', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const reviews = await userService.getMyReviews(request.user!.userId);
      reply.send(reviews);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get reviews' });
    }
  });

  fastify.post('/reviews', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const data = request.body as any;
      const review = await userService.createReview(request.user!.userId, data);
      reply.code(201).send(review);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.put('/reviews/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const data = request.body as any;
      const review = await userService.updateReview(id, request.user!.userId, data);
      reply.send(review);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.delete('/reviews/:id', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      await userService.deleteReview(id, request.user!.userId);
      reply.send({ message: 'Review deleted' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}
