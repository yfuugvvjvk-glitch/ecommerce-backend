import { PrismaClient } from '@prisma/client';
import { externalTranslationService, Locale } from './external-translation.service';

const prisma = new PrismaClient();

interface TranslationRequest {
  entityType: string;
  entityId: string;
  field: string;
  locale: Locale;
}

export class TranslationService {
  /**
   * Get translation for a specific entity field
   * Checks database first, generates if missing
   */
  async getTranslation(
    entityType: string,
    entityId: string,
    field: string,
    locale: Locale
  ): Promise<string> {
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
  async getTranslationsBatch(requests: TranslationRequest[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // Group requests by locale for efficient processing
    const byLocale = new Map<Locale, TranslationRequest[]>();
    
    for (const req of requests) {
      if (!byLocale.has(req.locale)) {
        byLocale.set(req.locale, []);
      }
      byLocale.get(req.locale)!.push(req);
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
      const existingMap = new Map<string, string>();
      for (const trans of existing) {
        const key = this.makeKey({
          entityType: trans.entityType,
          entityId: trans.entityId,
          field: trans.field,
          locale: trans.locale as Locale,
        });
        existingMap.set(key, trans.value);
      }

      // Identify missing translations
      const missing: TranslationRequest[] = [];
      for (const req of localeRequests) {
        const key = this.makeKey(req);
        if (existingMap.has(key)) {
          results.set(key, existingMap.get(key)!);
        } else {
          missing.push(req);
        }
      }

      // Generate missing translations
      if (missing.length > 0) {
        const sourceTexts: string[] = [];
        for (const req of missing) {
          const text = await this.getSourceText(req.entityType, req.entityId, req.field);
          sourceTexts.push(text);
        }

        // Batch translate
        const translated = await externalTranslationService.translateBatch(
          sourceTexts,
          'ro',
          locale
        );

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
  async generateTranslation(
    sourceText: string,
    sourceLocale: Locale,
    targetLocale: Locale
  ): Promise<string> {
    try {
      return await externalTranslationService.translate(sourceText, sourceLocale, targetLocale);
    } catch (error) {
      console.error('Translation generation failed:', error);
      return sourceText; // Fallback to source text
    }
  }

  /**
   * Store translation in database
   */
  async storeTranslation(
    entityType: string,
    entityId: string,
    field: string,
    locale: Locale,
    value: string,
    isAutomatic: boolean
  ): Promise<void> {
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
  async updateTranslation(
    id: string,
    value: string,
    status: 'manual' | 'reviewed'
  ): Promise<any> {
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
  async invalidateCache(entityType: string, entityId: string): Promise<void> {
    // TODO: Implement cache invalidation when cache is added
    console.log(`Cache invalidated for ${entityType}:${entityId}`);
  }

  /**
   * Get source text from entity
   */
  private async getSourceText(entityType: string, entityId: string, field: string): Promise<string> {
    try {
      switch (entityType) {
        case 'product':
          const product = await prisma.dataItem.findUnique({
            where: { id: entityId },
            select: { title: true, description: true, content: true },
          });
          if (!product) return '';
          
          if (field === 'title') return product.title;
          if (field === 'description') return product.description || '';
          if (field === 'content') return product.content || '';
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
          if (!page) return '';
          
          if (field === 'title') return page.title;
          if (field === 'content') return page.content || '';
          return '';

        default:
          console.warn(`Unknown entity type: ${entityType}`);
          return '';
      }
    } catch (error) {
      console.error(`Failed to get source text for ${entityType}:${entityId}:${field}`, error);
      return '';
    }
  }

  /**
   * Create cache key from request
   */
  private makeKey(req: TranslationRequest): string {
    return `${req.entityType}:${req.entityId}:${req.field}:${req.locale}`;
  }
}

// Export singleton instance
export const translationService = new TranslationService();
