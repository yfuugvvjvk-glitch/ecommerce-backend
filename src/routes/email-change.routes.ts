import { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { verificationService } from '../services/verification.service';
import { authMiddleware } from '../middleware/auth.middleware';

// Validation schemas
const ChangeEmailSchema = z.object({
  newEmail: z.string().email('Adresa de email nu este validă.'),
});

const VerifyEmailChangeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Codul de verificare trebuie să conțină exact 6 cifre.'),
});

/**
 * Email Change Routes
 * 
 * Handles email change verification flow:
 * 1. POST /api/user/change-email - Initiate email change (authenticated)
 * 2. POST /api/user/verify-email-change - Verify email change with code (authenticated)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */
export async function emailChangeRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/user/change-email
   * Initiate email change process
   * 
   * Sends notification to current email and verification code to new email.
   * 
   * Requirements:
   * - 2.1: Send notification to current email address
   * - 2.2: Generate 6-digit verification code
   * - 2.3: Send verification code to new email address
   */
  fastify.post(
    '/change-email',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const body = ChangeEmailSchema.parse(request.body);
        const userId = request.user!.userId;

        const result = await verificationService.sendEmailChangeCode(
          userId,
          body.newEmail
        );

        if (result.success) {
          return reply.status(200).send({
            success: true,
            message: result.message,
          });
        } else {
          return reply.status(400).send({
            success: false,
            error: result.message,
          });
        }
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
          error: 'A apărut o eroare la procesarea cererii. Vă rugăm să încercați din nou.',
        });
      }
    }
  );

  /**
   * POST /api/user/verify-email-change
   * Verify email change with code
   * 
   * Validates the verification code and updates the user's email address.
   * 
   * Requirements:
   * - 2.4: Validate code against stored hashed code
   * - 2.5: Update user's email address on successful verification
   */
  fastify.post(
    '/verify-email-change',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const body = VerifyEmailChangeSchema.parse(request.body);
        const userId = request.user!.userId;

        const result = await verificationService.verifyEmailChangeCode(
          userId,
          body.code
        );

        if (result.success) {
          return reply.status(200).send({
            success: true,
            message: result.message,
            user: result.user,
          });
        } else {
          return reply.status(400).send({
            success: false,
            error: result.message,
            remainingAttempts: result.remainingAttempts,
          });
        }
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
          error: 'A apărut o eroare la verificarea codului. Vă rugăm să încercați din nou.',
        });
      }
    }
  );
}
