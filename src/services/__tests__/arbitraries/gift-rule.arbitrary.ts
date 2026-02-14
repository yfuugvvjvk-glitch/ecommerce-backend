import * as fc from 'fast-check';
import { ConditionInput, CreateGiftRuleInput } from '../../gift-rule.service';

/**
 * Arbitrary for generating condition data
 */
export const arbitraryCondition = (): fc.Arbitrary<ConditionInput> =>
  fc.oneof(
    // MIN_AMOUNT condition
    fc.record({
      type: fc.constant('MIN_AMOUNT' as const),
      minAmount: fc.float({ min: 1, max: 10000, noNaN: true }),
    }),

    // SPECIFIC_PRODUCT condition
    fc.record({
      type: fc.constant('SPECIFIC_PRODUCT' as const),
      productId: fc.uuid(),
      minQuantity: fc.integer({ min: 1, max: 10 }),
    }),

    // PRODUCT_CATEGORY condition
    fc.record({
      type: fc.constant('PRODUCT_CATEGORY' as const),
      categoryId: fc.uuid(),
      minCategoryAmount: fc.option(fc.float({ min: 1, max: 5000, noNaN: true }), { nil: undefined }),
    }),

    // PRODUCT_QUANTITY condition
    fc.record({
      type: fc.constant('PRODUCT_QUANTITY' as const),
      productId: fc.uuid(),
      minQuantity: fc.integer({ min: 1, max: 10 }),
    })
  );

/**
 * Arbitrary for generating gift rule data
 */
export const arbitraryGiftRuleData = (): fc.Arbitrary<CreateGiftRuleInput> =>
  fc
    .record({
      name: fc.string({ minLength: 1, maxLength: 200 }),
      description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
      priority: fc.integer({ min: 1, max: 100 }),
      conditionLogic: fc.constantFrom('AND' as const, 'OR' as const),
      conditions: fc.array(arbitraryCondition(), { minLength: 1, maxLength: 3 }),
      giftProductIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
      maxUsesPerCustomer: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
      maxTotalUses: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
      validFrom: fc.option(
        fc.integer({ min: Date.parse('2024-01-01'), max: Date.parse('2025-12-31') }).map((timestamp) => new Date(timestamp).toISOString()),
        { nil: undefined }
      ),
      validUntil: fc.option(
        fc.integer({ min: Date.parse('2025-01-01'), max: Date.parse('2026-12-31') }).map((timestamp) => new Date(timestamp).toISOString()),
        { nil: undefined }
      ),
    })
    .filter((data) => {
      // Ensure validFrom is before validUntil if both are present
      if (data.validFrom && data.validUntil) {
        return new Date(data.validFrom) < new Date(data.validUntil);
      }
      return true;
    });
