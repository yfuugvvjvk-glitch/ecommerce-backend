import { FastifyInstance } from 'fastify';
import { translationService } from '../services/translation.service';
import { Locale } from '../services/external-translation.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { prisma } from '../utils/prisma';

export async function translationRoutes(fastify: FastifyInstance) {
  // GET /api/translations/:entityType/:entityId/:field - Get single translation
  fastify.get('/translations/:entityType/:entityId/:field', async (request, reply) => {
    try {
      const { entityType, entityId, field } = request.params as {
        entityType: string;
        entityId: string;
        field: string;
      };
      const { locale = 'ro' } = request.query as { locale?: Locale };

      // Validate locale
      const validLocales: Locale[] = ['ro', 'en', 'fr', 'de', 'es', 'it'];
      if (!validLocales.includes(locale)) {
        return reply.code(400).send({ error: 'Invalid locale' });
      }

      const value = await translationService.getTranslation(
        entityType,
        entityId,
        field,
        locale
      );

      // Check if translation is automatic or manual
      const translation = await prisma.translation.findUnique({
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // POST /api/translations/batch - Get multiple translations
  fastify.post('/translations/batch', async (request, reply) => {
    try {
      const { requests } = request.body as {
        requests: Array<{
          entityType: string;
          entityId: string;
          field: string;
          locale: Locale;
        }>;
      };

      if (!requests || !Array.isArray(requests) || requests.length === 0) {
        return reply.code(400).send({ error: 'Invalid requests array' });
      }

      // Validate all locales
      const validLocales: Locale[] = ['ro', 'en', 'fr', 'de', 'es', 'it'];
      for (const req of requests) {
        if (!validLocales.includes(req.locale)) {
          return reply.code(400).send({ error: `Invalid locale: ${req.locale}` });
        }
      }

      const results = await translationService.getTranslationsBatch(requests);

      // Convert Map to array of objects
      const translations = Array.from(results.entries()).map(([key, value]) => ({
        key,
        value,
      }));

      reply.send({ translations });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // GET /api/translations/:entityType/:entityId - Get all translations for entity
  fastify.get('/translations/:entityType/:entityId', async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as {
        entityType: string;
        entityId: string;
      };
      const { locale } = request.query as { locale?: Locale };

      const where: any = {
        entityType,
        entityId,
      };

      if (locale) {
        where.locale = locale;
      }

      const translations = await prisma.translation.findMany({
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
      const grouped: Record<string, any> = {};
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // PUT /api/translations/:id - Update translation (admin only)
  fastify.put(
    '/translations/:id',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { value, status } = request.body as {
          value: string;
          status: 'manual' | 'reviewed';
        };

        if (!value || !status) {
          return reply.code(400).send({ error: 'Value and status are required' });
        }

        if (status !== 'manual' && status !== 'reviewed') {
          return reply.code(400).send({ error: 'Invalid status' });
        }

        const translation = await translationService.updateTranslation(id, value, status);

        // Invalidate cache
        await translationService.invalidateCache(
          translation.entityType,
          translation.entityId
        );

        reply.send({ success: true, translation });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // POST /api/translations/generate - Generate missing translations (admin only)
  fastify.post(
    '/translations/generate',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        const { entityType, entityId, targetLocales } = request.body as {
          entityType: string;
          entityId: string;
          targetLocales: Locale[];
        };

        if (!entityType || !entityId || !targetLocales || !Array.isArray(targetLocales)) {
          return reply.code(400).send({ error: 'Invalid request body' });
        }

        const validLocales: Locale[] = ['ro', 'en', 'fr', 'de', 'es', 'it'];
        for (const locale of targetLocales) {
          if (!validLocales.includes(locale)) {
            return reply.code(400).send({ error: `Invalid locale: ${locale}` });
          }
        }

        let generated = 0;
        let failed = 0;

        // Determine fields based on entity type
        let fields: string[] = [];
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
              await translationService.getTranslation(entityType, entityId, field, locale);
              generated++;
            } catch (error) {
              console.error(`Failed to generate ${entityType}:${entityId}:${field}:${locale}`, error);
              failed++;
            }
          }
        }

        reply.send({ generated, failed });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // GET /api/translations/stats - Get translation statistics (admin only)
  fastify.get(
    '/translations/stats',
    { preHandler: [authMiddleware, adminMiddleware] },
    async (request, reply) => {
      try {
        const total = await prisma.translation.count();
        const automatic = await prisma.translation.count({
          where: { status: 'automatic' },
        });
        const manual = await prisma.translation.count({
          where: { status: 'manual' },
        });
        const reviewed = await prisma.translation.count({
          where: { status: 'reviewed' },
        });

        // Count by locale
        const byLocale: Record<string, number> = {};
        const locales: Locale[] = ['ro', 'en', 'fr', 'de', 'es', 'it'];
        
        for (const locale of locales) {
          byLocale[locale] = await prisma.translation.count({
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({ error: errorMessage });
      }
    }
  );
}
