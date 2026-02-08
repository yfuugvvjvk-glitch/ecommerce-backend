"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIRoutes = openAIRoutes;
const zod_1 = require("zod");
const openai_service_1 = require("../services/openai.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
// Validation schemas
const RecommendationsSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, 'Product ID is required'),
});
const GenerateDescriptionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    category: zod_1.z.string().min(1, 'Category is required'),
});
const ChatSchema = zod_1.z.object({
    messages: zod_1.z
        .array(zod_1.z.object({
        role: zod_1.z.enum(['system', 'user', 'assistant']),
        content: zod_1.z.string().min(1),
    }))
        .min(1, 'At least one message is required'),
});
const ModerateSchema = zod_1.z.object({
    text: zod_1.z.string().min(1, 'Text is required'),
});
async function openAIRoutes(fastify) {
    // Rate limiting for AI endpoints
    const rateLimitConfig = {
        max: 10,
        timeWindow: '1 minute',
    };
    /**
     * POST /api/ai/recommendations
     * Get AI-powered product recommendations
     */
    fastify.post('/recommendations', {
        config: {
            rateLimit: rateLimitConfig,
        },
    }, async (request, reply) => {
        try {
            const body = RecommendationsSchema.parse(request.body);
            // Get userId from token if authenticated
            let userId;
            try {
                const token = request.headers.authorization?.replace('Bearer ', '');
                if (token) {
                    const decoded = fastify.jwt.verify(token);
                    userId = decoded.userId;
                }
            }
            catch (error) {
                // User not authenticated, continue without userId
            }
            const recommendations = await openai_service_1.openAIService.generateProductRecommendations(body.productId, userId);
            return reply.status(200).send({
                success: true,
                recommendations,
                count: recommendations.length,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    });
    /**
     * POST /api/ai/generate-description
     * Generate product description (Admin only)
     */
    fastify.post('/generate-description', {
        preHandler: [auth_middleware_1.authenticateToken, admin_middleware_1.requireAdmin],
        config: {
            rateLimit: rateLimitConfig,
        },
    }, async (request, reply) => {
        try {
            const body = GenerateDescriptionSchema.parse(request.body);
            const description = await openai_service_1.openAIService.generateProductDescription(body.title, body.category);
            return reply.status(200).send({
                success: true,
                description,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    });
    /**
     * POST /api/ai/chat
     * Chat with AI assistant
     */
    fastify.post('/chat', {
        config: {
            rateLimit: rateLimitConfig,
        },
    }, async (request, reply) => {
        try {
            const body = ChatSchema.parse(request.body);
            // Moderate the last user message
            const lastUserMessage = [...body.messages]
                .reverse()
                .find((msg) => msg.role === 'user');
            if (lastUserMessage) {
                const moderation = await openai_service_1.openAIService.moderateContent(lastUserMessage.content);
                if (moderation.flagged) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Your message contains inappropriate content. Please rephrase and try again.',
                        moderation: moderation.categories,
                    });
                }
            }
            const response = await openai_service_1.openAIService.chatCompletion(body.messages);
            return reply.status(200).send({
                success: true,
                message: response,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return reply.status(400).send({
                    success: false,
                    error: 'Validation error',
                    details: error.issues,
                });
            }
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: error instanceof Error
                    ? error.message
                    : 'Failed to get AI response',
            });
        }
    });
    /**
     * POST /api/ai/moderate
     * Moderate content (for testing/admin purposes)
     */
    fastify.post('/moderate', {
        preHandler: [auth_middleware_1.authenticateToken],
        config: {
            rateLimit: rateLimitConfig,
        },
    }, async (request, reply) => {
        try {
            const body = ModerateSchema.parse(request.body);
            const moderation = await openai_service_1.openAIService.moderateContent(body.text);
            return reply.status(200).send({
                success: true,
                moderation,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    });
}
