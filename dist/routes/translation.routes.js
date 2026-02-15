"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationRoutes = translationRoutes;
const translation_service_1 = require("../services/translation.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const prisma_1 = require("../utils/prisma");
async function translationRoutes(fastify) {
    // GET /api/translations/:entityType/:entityId/:field - Get single translation
    fastify.get('/translations/:entityType/:entityId/:field', async (request, reply) => {
        try {
            const { entityType, entityId, field } = request.params;
            const { locale = 'ro' } = request.query;
            // Validate locale
            const validLocales = ['ro', 'en', 'fr', 'de', 'es', 'it'];
            if (!validLocales.includes(locale)) {
                return reply.code(400).send({ error: 'Invalid locale' });
            }
            const value = await translation_service_1.translationService.getTranslation(entityType, entityId, field, locale);
            // Check if translation is automatic or manual
            const translation = await prisma_1.prisma.translation.findUnique({
                where: {
                    entityType_entityId_field_locale: {
                        entityType,
                        entityId,
                        field,
                        locale,
                    },
                },
            });
            reply.send({
                value,
                locale,
                isAutomatic: translation?.isAutomatic ?? true,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // POST /api/translations/batch - Get multiple translations
    fastify.post('/translations/batch', async (request, reply) => {
        try {
            const { requests } = request.body;
            if (!requests || !Array.isArray(requests) || requests.length === 0) {
                return reply.code(400).send({ error: 'Invalid requests array' });
            }
            // Validate all locales
            const validLocales = ['ro', 'en', 'fr', 'de', 'es', 'it'];
            for (const req of requests) {
                if (!validLocales.includes(req.locale)) {
                    return reply.code(400).send({ error: `Invalid locale: ${req.locale}` });
                }
            }
            const results = await translation_service_1.translationService.getTranslationsBatch(requests);
            // Convert Map to array of objects
            const translations = Array.from(results.entries()).map(([key, value]) => ({
                key,
                value,
            }));
            reply.send({ translations });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/translations/:entityType/:entityId - Get all translations for entity
    fastify.get('/translations/:entityType/:entityId', async (request, reply) => {
        try {
            const { entityType, entityId } = request.params;
            const { locale } = request.query;
            const where = {
                entityType,
                entityId,
            };
            if (locale) {
                where.locale = locale;
            }
            const translations = await prisma_1.prisma.translation.findMany({
                where,
                select: {
                    id: true,
                    field: true,
                    locale: true,
                    value: true,
                    isAutomatic: true,
                    status: true,
                    updatedAt: true,
                },
            });
            // Group by field
            const grouped = {};
            for (const trans of translations) {
                if (!grouped[trans.field]) {
                    grouped[trans.field] = {};
                }
                grouped[trans.field][trans.locale] = {
                    value: trans.value,
                    isAutomatic: trans.isAutomatic,
                    status: trans.status,
                    updatedAt: trans.updatedAt,
                };
            }
            reply.send({ translations: grouped });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // PUT /api/translations/:id - Update translation (admin only)
    fastify.put('/translations/:id', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { value, status } = request.body;
            if (!value || !status) {
                return reply.code(400).send({ error: 'Value and status are required' });
            }
            if (status !== 'manual' && status !== 'reviewed') {
                return reply.code(400).send({ error: 'Invalid status' });
            }
            const translation = await translation_service_1.translationService.updateTranslation(id, value, status);
            // Invalidate cache
            await translation_service_1.translationService.invalidateCache(translation.entityType, translation.entityId);
            reply.send({ success: true, translation });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // POST /api/translations/generate - Generate missing translations (admin only)
    fastify.post('/translations/generate', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const { entityType, entityId, targetLocales } = request.body;
            if (!entityType || !entityId || !targetLocales || !Array.isArray(targetLocales)) {
                return reply.code(400).send({ error: 'Invalid request body' });
            }
            const validLocales = ['ro', 'en', 'fr', 'de', 'es', 'it'];
            for (const locale of targetLocales) {
                if (!validLocales.includes(locale)) {
                    return reply.code(400).send({ error: `Invalid locale: ${locale}` });
                }
            }
            let generated = 0;
            let failed = 0;
            // Determine fields based on entity type
            let fields = [];
            switch (entityType) {
                case 'product':
                    fields = ['title', 'description', 'content'];
                    break;
                case 'category':
                    fields = ['name'];
                    break;
                case 'chatMessage':
                    fields = ['content'];
                    break;
                case 'page':
                    fields = ['title', 'content'];
                    break;
                default:
                    return reply.code(400).send({ error: 'Unknown entity type' });
            }
            // Generate translations for each field and locale
            for (const field of fields) {
                for (const locale of targetLocales) {
                    try {
                        await translation_service_1.translationService.getTranslation(entityType, entityId, field, locale);
                        generated++;
                    }
                    catch (error) {
                        console.error(`Failed to generate ${entityType}:${entityId}:${field}:${locale}`, error);
                        failed++;
                    }
                }
            }
            reply.send({ generated, failed });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/translations/stats - Get translation statistics (admin only)
    fastify.get('/translations/stats', { preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware] }, async (request, reply) => {
        try {
            const total = await prisma_1.prisma.translation.count();
            const automatic = await prisma_1.prisma.translation.count({
                where: { status: 'automatic' },
            });
            const manual = await prisma_1.prisma.translation.count({
                where: { status: 'manual' },
            });
            const reviewed = await prisma_1.prisma.translation.count({
                where: { status: 'reviewed' },
            });
            // Count by locale
            const byLocale = {};
            const locales = ['ro', 'en', 'fr', 'de', 'es', 'it'];
            for (const locale of locales) {
                byLocale[locale] = await prisma_1.prisma.translation.count({
                    where: { locale },
                });
            }
            reply.send({
                total,
                automatic,
                manual,
                reviewed,
                byLocale,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
}
