import { PrismaClient } from '@prisma/client';
import { conditionEvaluator } from './condition-evaluator.service';

const prisma = new PrismaClient();

// Types
interface CartItemWithProduct {
  id: string;
  productId: string;
  quantity: number;
  isGift: boolean;
  giftRuleId: string | null;
  product: {
    id: string;
    title: string;
    price: number;
    categoryId: string;
    stock: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface OrderValidationResult {
  isValid: boolean;
  invalidGifts: string[];
  errors: string[];
}

class GiftValidatorService {
  /**
   * Validează selecția unui cadou înainte de adăugare în coș
   */
  async validateGiftSelection(
    userId: string,
    giftRuleId: string,
    productId: string,
    currentCart: CartItemWithProduct[]
  ): Promise<ValidationResult> {
    try {
      // 1. Verifică că regula există și este activă
      const rule = await prisma.giftRule.findUnique({
        where: { id: giftRuleId },
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

      if (!rule) {
        return {
          isValid: false,
          error: 'Gift rule not found',
        };
      }

      if (!rule.isActive) {
        return {
          isValid: false,
          error: 'Gift rule is not active',
        };
      }

      // 2. Verifică validitatea temporală
      const now = new Date();
      if (rule.validFrom && now < rule.validFrom) {
        return {
          isValid: false,
          error: 'Gift rule is not yet valid',
        };
      }
      if (rule.validUntil && now > rule.validUntil) {
        return {
          isValid: false,
          error: 'Gift rule has expired',
        };
      }

      // 3. Verifică că produsul face parte din cadourile regulii
      const giftProduct = rule.giftProducts.find((gp) => gp.productId === productId);
      if (!giftProduct) {
        return {
          isValid: false,
          error: 'Product is not a valid gift for this rule',
        };
      }

      // 4. Verifică stocul produsului
      const stockValid = await this.validateGiftStock(productId, giftRuleId);
      if (!stockValid) {
        return {
          isValid: false,
          error: 'Gift product is out of stock',
        };
      }

      // 5. Verifică că utilizatorul nu are deja un cadou din această regulă
      const existingGift = currentCart.find(
        (item) => item.isGift && item.giftRuleId === giftRuleId
      );

      if (existingGift) {
        return {
          isValid: false,
          error: 'You already have a gift from this rule',
        };
      }

      // 6. Verifică limita de utilizări per utilizator
      if (rule.maxUsesPerCustomer) {
        const usageCount = await prisma.giftRuleUsage.count({
          where: {
            userId,
            giftRuleId: rule.id,
          },
        });

        if (usageCount >= rule.maxUsesPerCustomer) {
          return {
            isValid: false,
            error: 'You have reached the usage limit for this gift rule',
          };
        }
      }

      // 7. Verifică limita totală de utilizări
      if (rule.maxTotalUses && rule.currentTotalUses >= rule.maxTotalUses) {
        return {
          isValid: false,
          error: 'Gift rule usage limit has been reached',
        };
      }

      // 8. Reevaluează condițiile pentru a preveni manipularea
      const context = this.buildEvaluationContext(currentCart, userId);
      const ruleData = this.transformRuleToData(rule);
      const evaluationResult = await conditionEvaluator.evaluateRule(ruleData, context);

      if (!evaluationResult.isEligible) {
        return {
          isValid: false,
          error: evaluationResult.reason || 'Conditions for this gift are not met',
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error validating gift selection:', error);
      return {
        isValid: false,
        error: 'An error occurred while validating gift selection',
      };
    }
  }

  /**
   * Validează stocul pentru un produs cadou
   */
  async validateGiftStock(productId: string, giftRuleId: string): Promise<boolean> {
    try {
      // Obține produsul
      const product = await prisma.dataItem.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return false;
      }

      // Verifică stocul disponibil
      if (product.stock <= 0) {
        return false;
      }

      // Verifică dacă există un remainingStock specific pentru acest gift product
      const giftProduct = await prisma.giftProduct.findFirst({
        where: {
          giftRuleId,
          productId,
        },
      });

      if (giftProduct && giftProduct.remainingStock !== null) {
        return giftProduct.remainingStock > 0;
      }

      return true;
    } catch (error) {
      console.error('Error validating gift stock:', error);
      return false;
    }
  }

  /**
   * Validează toate cadourile din coș înainte de plasarea comenzii
   */
  async validateGiftsInOrder(
    userId: string,
    cartItems: CartItemWithProduct[]
  ): Promise<OrderValidationResult> {
    const invalidGifts: string[] = [];
    const errors: string[] = [];

    // Filtrează doar cadourile
    const giftItems = cartItems.filter((item) => item.isGift);

    for (const giftItem of giftItems) {
      if (!giftItem.giftRuleId) {
        invalidGifts.push(giftItem.id);
        errors.push(`Gift item ${giftItem.product.title} has no associated rule`);
        continue;
      }

      // Validează fiecare cadou
      const validation = await this.validateGiftSelection(
        userId,
        giftItem.giftRuleId,
        giftItem.productId,
        cartItems
      );

      if (!validation.isValid) {
        invalidGifts.push(giftItem.id);
        errors.push(`${giftItem.product.title}: ${validation.error}`);
      }
    }

    return {
      isValid: invalidGifts.length === 0,
      invalidGifts,
      errors,
    };
  }

  /**
   * Construiește contextul de evaluare din coșul curent
   */
  private buildEvaluationContext(
    cartItems: CartItemWithProduct[],
    userId: string
  ) {
    // Calculează subtotal fără cadouri
    const subtotal = cartItems
      .filter((item) => !item.isGift)
      .reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    // Extrage ID-urile regulilor deja folosite
    const existingGiftRuleIds = cartItems
      .filter((item) => item.isGift && item.giftRuleId)
      .map((item) => item.giftRuleId as string);

    return {
      cartItems,
      userId,
      subtotal,
      existingGiftRuleIds,
    };
  }

  /**
   * Transformă o regulă Prisma în format GiftRuleData
   */
  private transformRuleToData(rule: any) {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      priority: rule.priority,
      conditionLogic: rule.conditionLogic,
      conditions: this.transformConditions(rule.conditions),
      giftProducts: rule.giftProducts.map((gp: any) => ({
        id: gp.id,
        productId: gp.productId,
        product: {
          id: gp.product.id,
          title: gp.product.title,
          image: gp.product.image,
          price: gp.product.price,
          stock: gp.product.stock,
        },
        maxQuantityPerOrder: gp.maxQuantityPerOrder,
        remainingStock: gp.remainingStock,
      })),
      maxUsesPerCustomer: rule.maxUsesPerCustomer,
      maxTotalUses: rule.maxTotalUses,
      currentTotalUses: rule.currentTotalUses,
      validFrom: rule.validFrom,
      validUntil: rule.validUntil,
    };
  }

  /**
   * Transformă condițiile din Prisma în format GiftConditionData
   */
  private transformConditions(conditions: any[]) {
    return conditions
      .filter((c: any) => !c.parentConditionId)
      .map((condition: any) => this.transformSingleCondition(condition, conditions));
  }

  /**
   * Transformă o singură condiție (recursiv pentru sub-condiții)
   */
  private transformSingleCondition(condition: any, allConditions: any[]): any {
    const subConditions: any[] = allConditions
      .filter((c: any) => c.parentConditionId === condition.id)
      .map((sub: any) => this.transformSingleCondition(sub, allConditions));

    return {
      id: condition.id,
      type: condition.type,
      minAmount: condition.minAmount,
      productId: condition.productId,
      minQuantity: condition.minQuantity,
      categoryId: condition.categoryId,
      minCategoryAmount: condition.minCategoryAmount,
      logic: condition.logic,
      subConditions: subConditions.length > 0 ? subConditions : undefined,
    };
  }
}

export const giftValidator = new GiftValidatorService();
export default giftValidator;
