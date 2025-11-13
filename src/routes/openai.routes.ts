import { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { openAIService } from '../services/openai.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

// Validation schemas
const RecommendationsSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

const GenerateDescriptionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
});

const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .min(1, 'At least one message is required'),
});

const ModerateSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export async function openAIRoutes(fastify: FastifyInstance) {
  // Rate limiting for AI endpoints
  const rateLimitConfig = {
    max: 10,
    timeWindow: '1 minute',
  };

  /**
   * POST /api/ai/recommendations
   * Get AI-powered product recommendations
   */
  fastify.post(
    '/recommendations',
    {
      config: {
        rateLimit: rateLimitConfig,
      },
    },
    async (request, reply) => {
      try {
        const body = RecommendationsSchema.parse(request.body);

        // Get userId from token if authenticated
        let userId: string | undefined;
        try {
          const token = request.headers.authorization?.replace('Bearer ', '');
          if (token) {
            const decoded = fastify.jwt.verify(token) as any;
            userId = decoded.userId;
          }
        } catch (error) {
          // User not authenticated, continue without userId
        }

        const recommendations =
          await openAIService.generateProductRecommendations(
            body.productId,
            userId
          );

        return reply.status(200).send({
          success: true,
          recommendations,
          count: recommendations.length,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.issues,
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to generate recommendations',
        });
      }
    }
  );

  /**
   * POST /api/ai/generate-description
   * Generate product description (Admin only)
   */
  fastify.post(
    '/generate-description',
    {
      preHandler: [authenticateToken, requireAdmin],
      config: {
        rateLimit: rateLimitConfig,
      },
    },
    async (request, reply) => {
      try {
        const body = GenerateDescriptionSchema.parse(request.body);

        const description = await openAIService.generateProductDescription(
          body.title,
          body.category
        );

        return reply.status(200).send({
          success: true,
          description,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.issues,
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to generate description',
        });
      }
    }
  );

  /**
   * POST /api/ai/chat
   * Chat with AI assistant
   */
  fastify.post(
    '/chat',
    {
      config: {
        rateLimit: rateLimitConfig,
      },
    },
    async (request, reply) => {
      try {
        const body = ChatSchema.parse(request.body);

        // Moderate the last user message
        const lastUserMessage = [...body.messages]
          .reverse()
          .find((msg) => msg.role === 'user');

        if (lastUserMessage) {
          const moderation = await openAIService.moderateContent(
            lastUserMessage.content
          );

          if (moderation.flagged) {
            return reply.status(400).send({
              success: false,
              error:
                'Your message contains inappropriate content. Please rephrase and try again.',
              moderation: moderation.categories,
            });
          }
        }

        const response = await openAIService.chatCompletion(body.messages);

        return reply.status(200).send({
          success: true,
          message: response,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.issues,
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get AI response',
        });
      }
    }
  );

  /**
   * POST /api/ai/moderate
   * Moderate content (for testing/admin purposes)
   */
  fastify.post(
    '/moderate',
    {
      preHandler: [authenticateToken],
      config: {
        rateLimit: rateLimitConfig,
      },
    },
    async (request, reply) => {
      try {
        const body = ModerateSchema.parse(request.body);

        const moderation = await openAIService.moderateContent(body.text);

        return reply.status(200).send({
          success: true,
          moderation,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.issues,
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to moderate content',
        });
      }
    }
  );
}
