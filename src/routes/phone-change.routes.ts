import { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Validation schemas
const ChangePhoneSchema = z.object({
  newPhone: z.string().min(10, 'Numărul de telefon trebuie să conțină cel puțin 10 caractere.'),
});

/**
 * Phone Change Routes
 * 
 * Handles phone number change directly without verification:
 * 1. POST /api/user/change-phone - Change phone number directly (authenticated)
 * 
 * Requirements: 4.1, 4.4
 */
export async function phoneChangeRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/user/change-phone
   * Change phone number directly without verification
   * 
   * Updates the user's phone number immediately.
   * 
   * Requirements:
   * - 4.4: Update user's phone number
   */
  fastify.post(
    '/change-phone',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const body = ChangePhoneSchema.parse(request.body);
        const userId = request.user!.userId;

        // Update phone number directly
        const user = await prisma.user.update({
          where: { id: userId },
          data: { phone: body.newPhone },
        });

        return reply.status(200).send({
          success: true,
          message: 'Numărul de telefon a fost schimbat cu succes.',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
          },
        });
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Eroare de validare',
            details: error.issues.map(issue => issue.message),
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'A apărut o eroare la schimbarea numărului de telefon. Vă rugăm să încercați din nou.',
        });
      }
    }
  );
}
