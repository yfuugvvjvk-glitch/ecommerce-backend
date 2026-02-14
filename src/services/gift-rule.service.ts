import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Zod schemas pentru validare
const ConditionSchema: z.ZodType<any> = z.object({
  type: z.enum(['MIN_AMOUNT', 'SPECIFIC_PRODUCT', 'PRODUCT_CATEGORY', 'PRODUCT_QUANTITY']),
  minAmount: z.number().positive().optional().nullable(),
  productId: z.string().optional().nullable(),
  minQuantity: z.number().int().positive().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  minCategoryAmount: z.number().positive().optional().nullable(),
  logic: z.enum(['AND', 'OR']).optional().nullable(),
  subConditions: z.array(z.lazy((): z.ZodTypeAny => ConditionSchema)).optional().nullable(),
});

const CreateGiftRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(100).default(50),
  isActive: z.boolean().optional().default(true),
  conditionLogic: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(ConditionSchema).min(1, 'At least one condition is required'),
  giftProductIds: z.array(z.string()).min(1, 'At least one gift product is required'),
  maxUsesPerCustomer: z.number().int().positive().optional(),
  maxTotalUses: z.number().int().positive().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

export type CreateGiftRuleInput = z.infer<typeof CreateGiftRuleSchema>;
export type ConditionInput = z.infer<typeof ConditionSchema>;

export class GiftRuleService {
  /**
   * Creează o regulă nouă de cadou
   */
  async createRule(data: CreateGiftRuleInput, userId: string) {
    // Validare input
    const validated = CreateGiftRuleSchema.parse(data);

    // Verifică că produsele cadou există
    const products = await prisma.dataItem.findMany({
      where: { id: { in: validated.giftProductIds } },
    });

    if (products.length !== validated.giftProductIds.length) {
      throw new Error('One or more gift products not found');
    }

    // Validare date temporale
    if (validated.validFrom && validated.validUntil) {
      const from = new Date(validated.validFrom);
      const until = new Date(validated.validUntil);
      if (from >= until) {
        throw new Error('validFrom must be before validUntil');
      }
    }

    // Creează regula cu condiții și produse cadou
    const rule = await prisma.giftRule.create({
      data: {
        name: validated.name,
        description: validated.description,
        priority: validated.priority,
        conditionLogic: validated.conditionLogic,
        maxUsesPerCustomer: validated.maxUsesPerCustomer,
        maxTotalUses: validated.maxTotalUses,
        validFrom: validated.validFrom ? new Date(validated.validFrom) : null,
        validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
        createdById: userId,
        conditions: {
          create: this.buildConditionsData(validated.conditions),
        },
        giftProducts: {
          create: validated.giftProductIds.map((productId) => ({
            productId,
            maxQuantityPerOrder: 1,
          })),
        },
      },
      include: {
        conditions: {
          include: {
            product: true,
            category: true,
            subConditions: true,
          },
        },
        giftProducts: {
          include: {
            product: true,
          },
        },
      },
    });

    return rule;
  }

  /**
   * Actualizează o regulă existentă
   */
  async updateRule(id: string, data: Partial<CreateGiftRuleInput>) {
    // Verifică că regula există
    const existing = await prisma.giftRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Gift rule not found');
    }

    // Validare parțială
    const validated = CreateGiftRuleSchema.partial().parse(data);

    // Validare date temporale
    if (validated.validFrom && validated.validUntil) {
      const from = new Date(validated.validFrom);
      const until = new Date(validated.validUntil);
      if (from >= until) {
        throw new Error('validFrom must be before validUntil');
      }
    }

    // Pregătește datele pentru update - exclude undefined values
    const updateData: any = {};
    
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.priority !== undefined) updateData.priority = validated.priority;
    if (validated.conditionLogic !== undefined) updateData.conditionLogic = validated.conditionLogic;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    if (validated.maxUsesPerCustomer !== undefined) updateData.maxUsesPerCustomer = validated.maxUsesPerCustomer;
    if (validated.maxTotalUses !== undefined) updateData.maxTotalUses = validated.maxTotalUses;
    if (validated.validFrom) updateData.validFrom = new Date(validated.validFrom);
    if (validated.validUntil) updateData.validUntil = new Date(validated.validUntil);

    // Dacă sunt condiții noi, șterge cele vechi și creează cele noi
    if (validated.conditions) {
      await prisma.giftCondition.deleteMany({
        where: { giftRuleId: id },
      });
      updateData.conditions = {
        create: this.buildConditionsData(validated.conditions),
      };
    }

    // Dacă sunt produse cadou noi, șterge cele vechi și creează cele noi
    if (validated.giftProductIds) {
      await prisma.giftProduct.deleteMany({
        where: { giftRuleId: id },
      });
      updateData.giftProducts = {
        create: validated.giftProductIds.map((productId) => ({
          productId,
          maxQuantityPerOrder: 1,
        })),
      };
    }

    const rule = await prisma.giftRule.update({
      where: { id },
      data: updateData,
      include: {
        conditions: {
          include: {
            product: true,
            category: true,
            subConditions: true,
          },
        },
        giftProducts: {
          include: {
            product: true,
          },
        },
      },
    });

    return rule;
  }

  /**
   * Șterge o regulă
   */
  async deleteRule(id: string) {
    const existing = await prisma.giftRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Gift rule not found');
    }

    await prisma.giftRule.delete({
      where: { id },
    });
  }

  /**
   * Obține o regulă după ID
   */
  async getRule(id: string) {
    const rule = await prisma.giftRule.findUnique({
      where: { id },
      include: {
        conditions: {
          include: {
            product: true,
            category: true,
            subConditions: true,
          },
        },
        giftProducts: {
          include: {
            product: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return rule;
  }

  /**
   * Obține toate regulile
   */
  async getAllRules(includeInactive: boolean = true) {
    const where = includeInactive ? {} : { isActive: true };

    const rules = await prisma.giftRule.findMany({
      where,
      include: {
        conditions: {
          include: {
            product: true,
            category: true,
            subConditions: true,
          },
        },
        giftProducts: {
          include: {
            product: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return rules;
  }

  /**
   * Obține doar regulile active
   */
  async getActiveRules() {
    const now = new Date();

    const rules = await prisma.giftRule.findMany({
      where: {
        isActive: true,
        OR: [
          { validFrom: null },
          { validFrom: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: now } },
            ],
          },
        ],
      },
      include: {
        conditions: {
          include: {
            product: true,
            category: true,
            subConditions: true,
          },
        },
        giftProducts: {
          include: {
            product: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return rules;
  }

  /**
   * Activează/dezactivează o regulă
   */
  async toggleRuleStatus(id: string, isActive: boolean) {
    const existing = await prisma.giftRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Gift rule not found');
    }

    const rule = await prisma.giftRule.update({
      where: { id },
      data: { isActive },
      include: {
        conditions: {
          include: {
            product: true,
            category: true,
            subConditions: true,
          },
        },
        giftProducts: {
          include: {
            product: true,
          },
        },
      },
    });

    return rule;
  }

  /**
   * Obține statistici pentru o regulă
   */
  async getRuleStatistics(id: string) {
    const rule = await prisma.giftRule.findUnique({
      where: { id },
      include: {
        usageHistory: {
          include: {
            product: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!rule) {
      throw new Error('Gift rule not found');
    }

    // Calculează statistici
    const totalUses = rule.usageHistory.length;
    const uniqueUsers = new Set(rule.usageHistory.map((u) => u.userId)).size;

    // Calculează valoarea totală oferită
    const totalValueGiven = rule.usageHistory.reduce((sum, usage) => {
      return sum + (usage.product.price || 0);
    }, 0);

    // Grupează utilizările pe produs
    const usageByProduct = rule.usageHistory.reduce((acc, usage) => {
      const productId = usage.productId;
      if (!acc[productId]) {
        acc[productId] = {
          productId,
          productName: usage.product.title,
          count: 0,
          totalValue: 0,
        };
      }
      acc[productId].count++;
      acc[productId].totalValue += usage.product.price || 0;
      return acc;
    }, {} as Record<string, any>);

    // Grupează utilizările pe zi pentru grafic
    const usageByDate = rule.usageHistory.reduce((acc, usage) => {
      const date = new Date(usage.usedAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      return acc;
    }, {} as Record<string, number>);

    const usageOverTime = Object.entries(usageByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalUses,
      uniqueUsers,
      totalValueGiven,
      usageByProduct: Object.values(usageByProduct),
      usageOverTime,
    };
  }

  /**
   * Helper pentru construirea datelor condițiilor (inclusiv imbricate)
   */
  private buildConditionsData(conditions: ConditionInput[]): any[] {
    return conditions.map((condition) => ({
      type: condition.type,
      minAmount: condition.minAmount,
      productId: condition.productId,
      minQuantity: condition.minQuantity,
      categoryId: condition.categoryId,
      minCategoryAmount: condition.minCategoryAmount,
      logic: condition.logic,
      subConditions: condition.subConditions
        ? {
            create: this.buildConditionsData(condition.subConditions),
          }
        : undefined,
    }));
  }
}

export const giftRuleService = new GiftRuleService();
