"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationService = exports.TranslationService = void 0;
const client_1 = require("@prisma/client");
const external_translation_service_1 = require("./external-translation.service");
const prisma = new client_1.PrismaClient();
class TranslationService {
    /**
     * Get translation for a specific entity field
     * Checks database first, generates if missing
     */
    async getTranslation(entityType, entityId, field, locale) {
        // If requesting Romanian (default), get from source entity
        if (locale === 'ro') {
            return this.getSourceText(entityType, entityId, field);
        }
        // Check if translation exists in database
        const existing = await prisma.translation.findUnique({
            where: {
                entityType_entityId_field_locale: {
                    entityType,
                    entityId,
                    field,
                    locale,
                },
            },
        });
        if (existing) {
            return existing.value;
        }
        // Translation doesn't exist, generate it
        const sourceText = await this.getSourceText(entityType, entityId, field);
        if (!sourceText) {
            return ''; // No source text available
        }
        // Generate translation using external service
        const translatedText = await this.generateTranslation(sourceText, 'ro', locale);
        // Store generated translation
        await this.storeTranslation(entityType, entityId, field, locale, translatedText, true);
        return translatedText;
    }
    /**
     * Get multiple translations in batch
     */
    async getTranslationsBatch(requests) {
        const results = new Map();
        // Group requests by locale for efficient processing
        const byLocale = new Map();
        for (const req of requests) {
            if (!byLocale.has(req.locale)) {
                byLocale.set(req.locale, []);
            }
            byLocale.get(req.locale).push(req);
        }
        // Process each locale group
        for (const [locale, localeRequests] of byLocale) {
            // If Romanian, get from source
            if (locale === 'ro') {
                for (const req of localeRequests) {
                    const key = this.makeKey(req);
                    const text = await this.getSourceText(req.entityType, req.entityId, req.field);
                    results.set(key, text);
                }
                continue;
            }
            // Check database for existing translations
            const entityIds = localeRequests.map(r => r.entityId);
            const existing = await prisma.translation.findMany({
                where: {
                    entityType: { in: localeRequests.map(r => r.entityType) },
                    entityId: { in: entityIds },
                    field: { in: localeRequests.map(r => r.field) },
                    locale,
                },
            });
            // Map existing translations
            const existingMap = new Map();
            for (const trans of existing) {
                const key = this.makeKey({
                    entityType: trans.entityType,
                    entityId: trans.entityId,
                    field: trans.field,
                    locale: trans.locale,
                });
                existingMap.set(key, trans.value);
            }
            // Identify missing translations
            const missing = [];
            for (const req of localeRequests) {
                const key = this.makeKey(req);
                if (existingMap.has(key)) {
                    results.set(key, existingMap.get(key));
                }
                else {
                    missing.push(req);
                }
            }
            // Generate missing translations
            if (missing.length > 0) {
                const sourceTexts = [];
                for (const req of missing) {
                    const text = await this.getSourceText(req.entityType, req.entityId, req.field);
                    sourceTexts.push(text);
                }
                // Batch translate
                const translated = await external_translation_service_1.externalTranslationService.translateBatch(sourceTexts, 'ro', locale);
                // Store and add to results
                for (let i = 0; i < missing.length; i++) {
                    const req = missing[i];
                    const key = this.makeKey(req);
                    const value = translated[i];
                    results.set(key, value);
                    // Store in database (fire and forget)
                    this.storeTranslation(req.entityType, req.entityId, req.field, req.locale, value, true)
                        .catch(err => console.error('Failed to store translation:', err));
                }
            }
        }
        return results;
    }
    /**
     * Generate translation using external service
     */
    async generateTranslation(sourceText, sourceLocale, targetLocale) {
        try {
            return await external_translation_service_1.externalTranslationService.translate(sourceText, sourceLocale, targetLocale);
        }
        catch (error) {
            console.error('Translation generation failed:', error);
            return sourceText; // Fallback to source text
        }
    }
    /**
     * Store translation in database
     */
    async storeTranslation(entityType, entityId, field, locale, value, isAutomatic) {
        await prisma.translation.upsert({
            where: {
                entityType_entityId_field_locale: {
                    entityType,
                    entityId,
                    field,
                    locale,
                },
            },
            update: {
                value,
                isAutomatic,
                status: isAutomatic ? 'automatic' : 'manual',
                updatedAt: new Date(),
            },
            create: {
                entityType,
                entityId,
                field,
                locale,
                value,
                isAutomatic,
                status: isAutomatic ? 'automatic' : 'manual',
            },
        });
    }
    /**
     * Update existing translation (manual override)
     */
    async updateTranslation(id, value, status) {
        return await prisma.translation.update({
            where: { id },
            data: {
                value,
                status,
                isAutomatic: false,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Invalidate cache for entity (placeholder for future cache implementation)
     */
    async invalidateCache(entityType, entityId) {
        // TODO: Implement cache invalidation when cache is added
        console.log(`Cache invalidated for ${entityType}:${entityId}`);
    }
    /**
     * Get source text from entity
     */
    async getSourceText(entityType, entityId, field) {
        try {
            switch (entityType) {
                case 'product':
                    const product = await prisma.dataItem.findUnique({
                        where: { id: entityId },
                        select: { title: true, description: true, content: true },
                    });
                    if (!product)
                        return '';
                    if (field === 'title')
                        return product.title;
                    if (field === 'description')
                        return product.description || '';
                    if (field === 'content')
                        return product.content || '';
                    return '';
                case 'category':
                    const category = await prisma.category.findUnique({
                        where: { id: entityId },
                        select: { nameRo: true },
                    });
                    return category?.nameRo || '';
                case 'chatMessage':
                    const message = await prisma.chatMessage.findUnique({
                        where: { id: entityId },
                        select: { content: true },
                    });
                    return message?.content || '';
                case 'page':
                    const page = await prisma.page.findUnique({
                        where: { id: entityId },
                        select: { title: true, content: true },
                    });
                    if (!page)
                        return '';
                    if (field === 'title')
                        return page.title;
                    if (field === 'content')
                        return page.content || '';
                    return '';
                default:
                    console.warn(`Unknown entity type: ${entityType}`);
                    return '';
            }
        }
        catch (error) {
            console.error(`Failed to get source text for ${entityType}:${entityId}:${field}`, error);
            return '';
        }
    }
    /**
     * Create cache key from request
     */
    makeKey(req) {
        return `${req.entityType}:${req.entityId}:${req.field}:${req.locale}`;
    }
}
exports.TranslationService = TranslationService;
// Export singleton instance
exports.translationService = new TranslationService();
