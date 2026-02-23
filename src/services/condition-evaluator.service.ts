import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types
type ConditionType = 'MIN_AMOUNT' | 'SPECIFIC_PRODUCT' | 'PRODUCT_CATEGORY' | 'PRODUCT_QUANTITY';
type ConditionLogic = 'AND' | 'OR';

interface GiftConditionData {
  id: string;
  type: ConditionType;
  minAmount?: number;
  productId?: string;
  minQuantity?: number;
  categoryId?: string;
  minCategoryAmount?: number;
  logic?: ConditionLogic;
  subConditions?: GiftConditionData[];
}

interface GiftProductData {
  id: string;
  productId: string;
  dataItem: {
    id: string;
    title: string;
    titleEn?: string | null;
    titleFr?: string | null;
    titleDe?: string | null;
    titleEs?: string | null;
    titleIt?: string | null;
    image: string;
    price: number;
    stock: number;
  };
  maxQuantityPerOrder: number;
  remainingStock: number | null;
}

interface GiftRuleData {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  priority: number;
  conditionLogic: ConditionLogic;
  conditions: GiftConditionData[];
  giftProducts: GiftProductData[];
  maxUsesPerCustomer: number | null;
  maxTotalUses: number | null;
  currentTotalUses: number;
  validFrom: Date | null;
  validUntil: Date | null;
}

interface CartItemWithProduct {
  id: string;
  productId: string;
  quantity: number;
  isGift: boolean;
  giftRuleId: string | null;
  dataItem: {
    id: string;
    title: string;
    price: number;
    categoryId: string;
    stock: number;
  };
}

interface EvaluationContext {
  cartItems: CartItemWithProduct[];
  userId: string;
  subtotal: number;
  existingGiftRuleIds: string[];
}

interface EvaluationResult {
  isEligible: boolean;
  rule: GiftRuleData;
  reason?: string;
}

class ConditionEvaluatorService {
  /**
   * Evaluează o regulă completă pentru a determina dacă este eligibilă
   */
  async evaluateRule(
    rule: GiftRuleData,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    // 1. Verifică dacă regula este activă
    if (!rule.isActive) {
      return { isEligible: false, rule, reason: 'Rule is not active' };
    }

    // 2. Verifică validitatea temporală
    const now = new Date();
    if (rule.validFrom && now < rule.validFrom) {
      return { isEligible: false, rule, reason: 'Rule not yet valid' };
    }
    if (rule.validUntil && now > rule.validUntil) {
      return { isEligible: false, rule, reason: 'Rule expired' };
    }

    // 3. Verifică limita totală de utilizări
    if (rule.maxTotalUses && rule.currentTotalUses >= rule.maxTotalUses) {
      return { isEligible: false, rule, reason: 'Rule usage limit reached' };
    }

    // 4. Verifică limita per utilizator
    if (rule.maxUsesPerCustomer) {
      const userUsageCount = await this.getUserUsageCount(context.userId, rule.id);
      if (userUsageCount >= rule.maxUsesPerCustomer) {
        return { isEligible: false, rule, reason: 'User usage limit reached' };
      }
    }

    // 5. Verifică dacă utilizatorul deja are un cadou din această regulă
    if (context.existingGiftRuleIds.includes(rule.id)) {
      return {
        isEligible: false,
        rule,
        reason: 'Gift already selected from this rule',
      };
    }

    // 6. Evaluează condițiile
    const conditionsResult = await this.evaluateConditions(
      rule.conditions,
      rule.conditionLogic,
      context
    );

    if (!conditionsResult) {
      return { isEligible: false, rule, reason: 'Conditions not met' };
    }

    return { isEligible: true, rule };
  }

  /**
   * Evaluează toate regulile active pentru un context dat
   */
  async evaluateAllRules(context: EvaluationContext): Promise<EvaluationResult[]> {
    // Obține toate regulile active sortate după prioritate
    const activeRules = await prisma.giftRule.findMany({
      where: { isActive: true },
      include: {
        GiftCondition: {
          include: { 
            DataItem: true,
            Category: true,
            GiftCondition: true,
          },
        },
        GiftProduct: {
          include: { DataItem: true },
        },
      },
      orderBy: { priority: 'desc' },
    });

    console.log('📊 Found active rules:', activeRules.length);
    activeRules.forEach(rule => {
      console.log(`  - ${rule.name}: ${rule.GiftCondition.length} conditions, ${rule.GiftProduct.length} gift products`);
      rule.GiftCondition.forEach(cond => {
        console.log(`    Condition: type=${cond.type}, minAmount=${cond.minAmount}, parentConditionId=${cond.parentConditionId}`);
      });
      rule.GiftProduct.forEach(gp => {
        console.log(`    Gift Product: ${gp.DataItem.title}, stock=${gp.DataItem.stock}`);
      });
    });

    // Transformă în GiftRuleData format
    const rules: GiftRuleData[] = activeRules.map((rule) => {
      const transformedConditions = this.transformConditions(rule.GiftCondition);
      console.log(`📊 Rule "${rule.name}" transformed conditions:`, JSON.stringify(transformedConditions, null, 2));
      
      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        isActive: rule.isActive,
        priority: rule.priority,
        conditionLogic: rule.conditionLogic as ConditionLogic,
        conditions: transformedConditions,
        giftProducts: rule.GiftProduct.map((gp) => ({
          id: gp.id,
          productId: gp.productId,
          dataItem: {
            id: gp.DataItem.id,
            title: gp.DataItem.title,
            titleEn: gp.DataItem.titleEn,
            titleFr: gp.DataItem.titleFr,
            titleDe: gp.DataItem.titleDe,
            titleEs: gp.DataItem.titleEs,
            titleIt: gp.DataItem.titleIt,
            image: gp.DataItem.image,
            price: gp.DataItem.price,
            stock: gp.DataItem.stock,
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
    });

    console.log('📊 Transformed rules:', rules.length);
    console.log('📊 Context subtotal:', context.subtotal);
    console.log('📊 Context cart items:', context.cartItems.length);

    // Evaluează fiecare regulă
    const results = await Promise.all(
      rules.map((rule) => this.evaluateRule(rule, context))
    );

    console.log('📊 Evaluation results:');
    results.forEach(result => {
      console.log(`  - ${result.rule.name}: eligible=${result.isEligible}, reason=${result.reason || 'N/A'}`);
    });

    return results;
  }

  /**
   * Evaluează un set de condiții cu logică AND/OR
   */
  private async evaluateConditions(
    conditions: GiftConditionData[],
    logic: ConditionLogic,
    context: EvaluationContext
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    const results = await Promise.all(
      conditions.map((condition) => this.evaluateSingleCondition(condition, context))
    );

    if (logic === 'AND') {
      return results.every((r) => r === true);
    } else {
      // OR
      return results.some((r) => r === true);
    }
  }

  /**
   * Evaluează o singură condiție (cu suport pentru condiții imbricate)
   */
  private async evaluateSingleCondition(
    condition: GiftConditionData,
    context: EvaluationContext
  ): Promise<boolean> {
    // Dacă are sub-condiții, evaluează recursiv
    if (condition.subConditions && condition.subConditions.length > 0) {
      return this.evaluateConditions(
        condition.subConditions,
        condition.logic || 'AND',
        context
      );
    }

    // Evaluează condiția în funcție de tip
    switch (condition.type) {
      case 'MIN_AMOUNT':
        return this.evaluateMinAmount(condition, context);

      case 'SPECIFIC_PRODUCT':
        return this.evaluateSpecificProduct(condition, context);

      case 'PRODUCT_CATEGORY':
        return this.evaluateProductCategory(condition, context);

      case 'PRODUCT_QUANTITY':
        return this.evaluateProductQuantity(condition, context);

      default:
        return false;
    }
  }

  /**
   * Evaluează condiția MIN_AMOUNT
   */
  private evaluateMinAmount(
    condition: GiftConditionData,
    context: EvaluationContext
  ): boolean {
    if (!condition.minAmount) {
      console.log('❌ MIN_AMOUNT condition has no minAmount value');
      return false;
    }

    // Calculează subtotal fără produsele cadou
    const subtotal = context.cartItems
      .filter((item) => !item.isGift)
      .reduce((sum, item) => sum + item.dataItem.price * item.quantity, 0);

    console.log(`💰 MIN_AMOUNT evaluation: required=${condition.minAmount}, actual=${subtotal}, result=${subtotal >= condition.minAmount}`);
    
    return subtotal >= condition.minAmount;
  }

  /**
   * Evaluează condiția SPECIFIC_PRODUCT
   */
  private evaluateSpecificProduct(
    condition: GiftConditionData,
    context: EvaluationContext
  ): boolean {
    if (!condition.productId) return false;

    const productInCart = context.cartItems.find(
      (item) => !item.isGift && item.productId === condition.productId
    );

    if (!productInCart) return false;

    const minQty = condition.minQuantity || 1;
    return productInCart.quantity >= minQty;
  }

  /**
   * Evaluează condiția PRODUCT_CATEGORY
   */
  private evaluateProductCategory(
    condition: GiftConditionData,
    context: EvaluationContext
  ): boolean {
    if (!condition.categoryId) return false;

    const categoryItems = context.cartItems.filter(
      (item) => !item.isGift && item.dataItem.categoryId === condition.categoryId
    );

    if (categoryItems.length === 0) return false;

    // Dacă există minCategoryAmount, verifică suma
    if (condition.minCategoryAmount) {
      const categoryTotal = categoryItems.reduce(
        (sum, item) => sum + item.dataItem.price * item.quantity,
        0
      );
      return categoryTotal >= condition.minCategoryAmount;
    }

    return true;
  }

  /**
   * Evaluează condiția PRODUCT_QUANTITY
   */
  private evaluateProductQuantity(
    condition: GiftConditionData,
    context: EvaluationContext
  ): boolean {
    if (!condition.productId) return false;

    const productInCart = context.cartItems.find(
      (item) => !item.isGift && item.productId === condition.productId
    );

    if (!productInCart) return false;

    const minQty = condition.minQuantity || 1;
    return productInCart.quantity >= minQty;
  }

  /**
   * Obține numărul de utilizări ale unei reguli de către un utilizator
   */
  private async getUserUsageCount(userId: string, ruleId: string): Promise<number> {
    const count = await prisma.giftRuleUsage.count({
      where: {
        userId,
        giftRuleId: ruleId,
      },
    });

    return count;
  }

  /**
   * Transformă condițiile din Prisma în format GiftConditionData
   */
  private transformConditions(conditions: any[]): GiftConditionData[] {
    return conditions
      .filter((c) => !c.parentConditionId) // Doar condițiile de nivel superior
      .map((condition) => this.transformSingleCondition(condition, conditions));
  }

  /**
   * Transformă o singură condiție (recursiv pentru sub-condiții)
   */
  private transformSingleCondition(
    condition: any,
    allConditions: any[]
  ): GiftConditionData {
    const subConditions = allConditions
      .filter((c) => c.parentConditionId === condition.id)
      .map((sub) => this.transformSingleCondition(sub, allConditions));

    return {
      id: condition.id,
      type: condition.type as ConditionType,
      minAmount: condition.minAmount,
      productId: condition.productId,
      minQuantity: condition.minQuantity,
      categoryId: condition.categoryId,
      minCategoryAmount: condition.minCategoryAmount,
      logic: condition.logic as ConditionLogic | undefined,
      subConditions: subConditions.length > 0 ? subConditions : undefined,
    };
  }

  /**
   * Verifică dacă un utilizator a atins limita de utilizări pentru o regulă
   */
  async checkUserLimit(
    userId: string,
    ruleId: string,
    maxUses: number | null
  ): Promise<boolean> {
    if (!maxUses) return true; // Unlimited

    const usageCount = await this.getUserUsageCount(userId, ruleId);
    return usageCount < maxUses;
  }
}

export const conditionEvaluator = new ConditionEvaluatorService();
export default conditionEvaluator;
