import * as fc from 'fast-check';
import { GiftRuleService } from '../gift-rule.service';
import { PrismaClient } from '@prisma/client';
import { arbitraryGiftRuleData } from './arbitraries/gift-rule.arbitrary';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockDataItemFindMany = jest.fn();
  const mockGiftRuleCreate = jest.fn();
  const mockGiftRuleFindUnique = jest.fn();
  const mockGiftRuleUpdate = jest.fn();
  const mockGiftRuleDelete = jest.fn();
  const mockGiftConditionDeleteMany = jest.fn();
  const mockGiftProductDeleteMany = jest.fn();

  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      dataItem: {
        findMany: mockDataItemFindMany,
      },
      giftRule: {
        create: mockGiftRuleCreate,
        findUnique: mockGiftRuleFindUnique,
        update: mockGiftRuleUpdate,
        delete: mockGiftRuleDelete,
      },
      giftCondition: {
        deleteMany: mockGiftConditionDeleteMany,
      },
      giftProduct: {
        deleteMany: mockGiftProductDeleteMany,
      },
    })),
    __mockDataItemFindMany: mockDataItemFindMany,
    __mockGiftRuleCreate: mockGiftRuleCreate,
    __mockGiftRuleFindUnique: mockGiftRuleFindUnique,
    __mockGiftRuleUpdate: mockGiftRuleUpdate,
    __mockGiftRuleDelete: mockGiftRuleDelete,
    __mockGiftConditionDeleteMany: mockGiftConditionDeleteMany,
    __mockGiftProductDeleteMany: mockGiftProductDeleteMany,
  };
});

const {
  __mockDataItemFindMany: mockDataItemFindMany,
  __mockGiftRuleCreate: mockGiftRuleCreate,
  __mockGiftRuleFindUnique: mockGiftRuleFindUnique,
  __mockGiftRuleUpdate: mockGiftRuleUpdate,
  __mockGiftRuleDelete: mockGiftRuleDelete,
  __mockGiftConditionDeleteMany: mockGiftConditionDeleteMany,
  __mockGiftProductDeleteMany: mockGiftProductDeleteMany,
} = jest.requireMock('@prisma/client');

describe('GiftRuleService - Property-Based Tests', () => {
  let giftRuleService: GiftRuleService;
  const testUserId = 'test-admin-user-id';

  beforeEach(() => {
    giftRuleService = new GiftRuleService();
    jest.clearAllMocks();
  });

  describe('Property 1: Rule Creation Persistence', () => {
    // Feature: gift-products-system, Property 1: Rule Creation Persistence
    // Validates: Requirements 2.1.1
    it('should persist and retrieve any valid gift rule with all properties intact', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryGiftRuleData(), async (ruleData) => {
          // Mock that all gift products exist
          mockDataItemFindMany.mockResolvedValue(
            ruleData.giftProductIds.map((id) => ({
              id,
              title: `Product ${id}`,
              price: 100,
              stock: 10,
            }))
          );

          // Create a mock created rule
          const mockCreatedRule = {
            id: fc.sample(fc.uuid(), 1)[0],
            name: ruleData.name,
            description: ruleData.description || null,
            isActive: true,
            priority: ruleData.priority,
            conditionLogic: ruleData.conditionLogic,
            maxUsesPerCustomer: ruleData.maxUsesPerCustomer || null,
            maxTotalUses: ruleData.maxTotalUses || null,
            currentTotalUses: 0,
            validFrom: ruleData.validFrom ? new Date(ruleData.validFrom) : null,
            validUntil: ruleData.validUntil ? new Date(ruleData.validUntil) : null,
            createdById: testUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
            conditions: ruleData.conditions.map((c, idx) => ({
              id: `condition-${idx}`,
              giftRuleId: 'rule-id',
              type: c.type,
              minAmount: c.minAmount || null,
              productId: c.productId || null,
              minQuantity: c.minQuantity || null,
              categoryId: c.categoryId || null,
              minCategoryAmount: c.minCategoryAmount || null,
              parentConditionId: null,
              logic: c.logic || null,
              createdAt: new Date(),
              updatedAt: new Date(),
              product: null,
              category: null,
              subConditions: [],
            })),
            giftProducts: ruleData.giftProductIds.map((productId, idx) => ({
              id: `gift-product-${idx}`,
              giftRuleId: 'rule-id',
              productId,
              maxQuantityPerOrder: 1,
              remainingStock: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              product: {
                id: productId,
                title: `Product ${productId}`,
                price: 100,
                stock: 10,
              },
            })),
          };

          mockGiftRuleCreate.mockResolvedValue(mockCreatedRule);
          mockGiftRuleFindUnique.mockResolvedValue(mockCreatedRule);

          // Create the rule
          const created = await giftRuleService.createRule(ruleData, testUserId);

          // Retrieve the rule
          const retrieved = await giftRuleService.getRule(created.id);

          // Verify all properties are intact
          expect(retrieved).toBeDefined();
          expect(retrieved?.name).toBe(ruleData.name);
          expect(retrieved?.description).toBe(ruleData.description || null);
          expect(retrieved?.priority).toBe(ruleData.priority);
          expect(retrieved?.conditionLogic).toBe(ruleData.conditionLogic);
          expect(retrieved?.maxUsesPerCustomer).toBe(ruleData.maxUsesPerCustomer || null);
          expect(retrieved?.maxTotalUses).toBe(ruleData.maxTotalUses || null);
          expect(retrieved?.conditions.length).toBe(ruleData.conditions.length);
          expect(retrieved?.giftProducts.length).toBe(ruleData.giftProductIds.length);
        }),
        { numRuns: 100 }
      );
    });
  });
});