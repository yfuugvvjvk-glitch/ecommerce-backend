import { GiftRuleService, CreateGiftRuleInput } from '../../../services/gift-rule.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const giftRuleService = new GiftRuleService();

// Test IDs
let TEST_USER_ID: string;
let TEST_CATEGORY_ID: string;

describe('GiftRuleService - Validation Unit Tests', () => {
  // Create test user and category before all tests
  beforeAll(async () => {
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'test-password',
        role: 'admin',
      },
    });
    TEST_USER_ID = testUser.id;

    const testCategory = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: `test-category-${Date.now()}`,
      },
    });
    TEST_CATEGORY_ID = testCategory.id;
  });

  // Clean up test data after each test
  afterEach(async () => {
    await prisma.giftRule.deleteMany({
      where: { createdById: TEST_USER_ID },
    });
  });

  afterAll(async () => {
    // Clean up test category and user
    await prisma.category.delete({
      where: { id: TEST_CATEGORY_ID },
    });
    await prisma.user.delete({
      where: { id: TEST_USER_ID },
    });
    await prisma.$disconnect();
  });

  describe('Name Requirement Validation (Requirements 2.1.5)', () => {
    it('should reject rule creation with empty name', async () => {
      const invalidData: CreateGiftRuleInput = {
        name: '',
        description: 'Test description',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with whitespace-only name', async () => {
      const invalidData: CreateGiftRuleInput = {
        name: '   ',
        description: 'Test description',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule update with empty name', async () => {
      // This test validates that name requirement is enforced during updates
      const updateData: Partial<CreateGiftRuleInput> = {
        name: '',
      };

      await expect(
        giftRuleService.updateRule('any-id', updateData)
      ).rejects.toThrow();
    });

    it('should accept rule creation with valid non-empty name', async () => {
      // Create a test product first
      const testProduct = await prisma.dataItem.create({
        data: {
          title: 'Test Product',
          content: 'Test content',
          price: 100,
          stock: 10,
          image: 'test.jpg',
          categoryId: TEST_CATEGORY_ID,
          userId: TEST_USER_ID,
        },
      });

      const validData: CreateGiftRuleInput = {
        name: 'Valid Rule Name',
        description: 'Test description',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: [testProduct.id],
      };

      const rule = await giftRuleService.createRule(validData, TEST_USER_ID);

      expect(rule).toBeDefined();
      expect(rule.name).toBe('Valid Rule Name');

      // Clean up test product
      await prisma.dataItem.delete({ where: { id: testProduct.id } });
    });
  });

  describe('Priority Bounds Validation (Requirements 2.1.6)', () => {
    it('should reject rule creation with priority below 1', async () => {
      const invalidData: CreateGiftRuleInput = {
        name: 'Test Rule',
        priority: 0,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with negative priority', async () => {
      const invalidData: CreateGiftRuleInput = {
        name: 'Test Rule',
        priority: -5,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with priority above 100', async () => {
      const invalidData: CreateGiftRuleInput = {
        name: 'Test Rule',
        priority: 101,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should accept rule creation with priority at lower bound (1)', async () => {
      const testProduct = await prisma.dataItem.create({
        data: {
          title: 'Test Product',
          content: 'Test content',
          price: 100,
          stock: 10,
          image: 'test.jpg',
          categoryId: TEST_CATEGORY_ID,
          userId: TEST_USER_ID,
        },
      });

      const validData: CreateGiftRuleInput = {
        name: 'Test Rule',
        priority: 1,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: [testProduct.id],
      };

      const rule = await giftRuleService.createRule(validData, TEST_USER_ID);

      expect(rule).toBeDefined();
      expect(rule.priority).toBe(1);

      await prisma.dataItem.delete({ where: { id: testProduct.id } });
    });

    it('should accept rule creation with priority at upper bound (100)', async () => {
      const testProduct = await prisma.dataItem.create({
        data: {
          title: 'Test Product',
          content: 'Test content',
          price: 100,
          stock: 10,
          image: 'test.jpg',
          categoryId: TEST_CATEGORY_ID,
          userId: TEST_USER_ID,
        },
      });

      const validData: CreateGiftRuleInput = {
        name: 'Test Rule',
        priority: 100,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: [testProduct.id],
      };

      const rule = await giftRuleService.createRule(validData, TEST_USER_ID);

      expect(rule).toBeDefined();
      expect(rule.priority).toBe(100);

      await prisma.dataItem.delete({ where: { id: testProduct.id } });
    });

    it('should accept rule creation with priority in valid range (50)', async () => {
      const testProduct = await prisma.dataItem.create({
        data: {
          title: 'Test Product',
          content: 'Test content',
          price: 100,
          stock: 10,
          image: 'test.jpg',
          categoryId: TEST_CATEGORY_ID,
          userId: TEST_USER_ID,
        },
      });

      const validData: CreateGiftRuleInput = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: [testProduct.id],
      };

      const rule = await giftRuleService.createRule(validData, TEST_USER_ID);

      expect(rule).toBeDefined();
      expect(rule.priority).toBe(50);

      await prisma.dataItem.delete({ where: { id: testProduct.id } });
    });

    it('should reject rule update with invalid priority', async () => {
      const updateData: Partial<CreateGiftRuleInput> = {
        priority: 150,
      };

      await expect(
        giftRuleService.updateRule('any-id', updateData)
      ).rejects.toThrow();
    });
  });

  describe('Invalid Data Rejection', () => {
    it('should reject rule creation with missing conditions', async () => {
      const invalidData: any = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with missing gift products', async () => {
      const invalidData: any = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: [],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with invalid condition type', async () => {
      const invalidData: any = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'INVALID_TYPE',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with invalid conditionLogic', async () => {
      const invalidData: any = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'INVALID',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with non-existent gift products', async () => {
      const invalidData: CreateGiftRuleInput = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['non-existent-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow('One or more gift products not found');
    });

    it('should reject rule creation with invalid temporal dates', async () => {
      const testProduct = await prisma.dataItem.create({
        data: {
          title: 'Test Product',
          content: 'Test content',
          price: 100,
          stock: 10,
          image: 'test.jpg',
          categoryId: TEST_CATEGORY_ID,
          userId: TEST_USER_ID,
        },
      });

      const invalidData: CreateGiftRuleInput = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: [testProduct.id],
        validFrom: '2024-12-31T00:00:00Z',
        validUntil: '2024-01-01T00:00:00Z', // validUntil before validFrom
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow('validFrom must be before validUntil');

      await prisma.dataItem.delete({ where: { id: testProduct.id } });
    });

    it('should reject rule creation with negative minAmount in condition', async () => {
      const invalidData: any = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: -100,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with zero minAmount in condition', async () => {
      const invalidData: any = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 0,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with non-integer priority', async () => {
      const invalidData: any = {
        name: 'Test Rule',
        priority: 50.5,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with negative maxUsesPerCustomer', async () => {
      const invalidData: any = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
        maxUsesPerCustomer: -1,
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should reject rule creation with negative maxTotalUses', async () => {
      const invalidData: any = {
        name: 'Test Rule',
        priority: 50,
        conditionLogic: 'AND',
        conditions: [
          {
            type: 'MIN_AMOUNT',
            minAmount: 100,
          },
        ],
        giftProductIds: ['test-product-id'],
        maxTotalUses: -1,
      };

      await expect(
        giftRuleService.createRule(invalidData, TEST_USER_ID)
      ).rejects.toThrow();
    });
  });
});
