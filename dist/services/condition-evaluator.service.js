"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conditionEvaluator = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ConditionEvaluatorService {
    /**
     * Evaluează o regulă completă pentru a determina dacă este eligibilă
     */
    async evaluateRule(rule, context) {
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
        const conditionsResult = await this.evaluateConditions(rule.conditions, rule.conditionLogic, context);
        if (!conditionsResult) {
            return { isEligible: false, rule, reason: 'Conditions not met' };
        }
        return { isEligible: true, rule };
    }
    /**
     * Evaluează toate regulile active pentru un context dat
     */
    async evaluateAllRules(context) {
        // Obține toate regulile active sortate după prioritate
        const activeRules = await prisma.giftRule.findMany({
            where: { isActive: true },
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
            orderBy: { priority: 'desc' },
        });
        // Transformă în GiftRuleData format
        const rules = activeRules.map((rule) => ({
            id: rule.id,
            name: rule.name,
            description: rule.description,
            isActive: rule.isActive,
            priority: rule.priority,
            conditionLogic: rule.conditionLogic,
            conditions: this.transformConditions(rule.conditions),
            giftProducts: rule.giftProducts.map((gp) => ({
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
        }));
        // Evaluează fiecare regulă
        const results = await Promise.all(rules.map((rule) => this.evaluateRule(rule, context)));
        return results;
    }
    /**
     * Evaluează un set de condiții cu logică AND/OR
     */
    async evaluateConditions(conditions, logic, context) {
        if (conditions.length === 0)
            return true;
        const results = await Promise.all(conditions.map((condition) => this.evaluateSingleCondition(condition, context)));
        if (logic === 'AND') {
            return results.every((r) => r === true);
        }
        else {
            // OR
            return results.some((r) => r === true);
        }
    }
    /**
     * Evaluează o singură condiție (cu suport pentru condiții imbricate)
     */
    async evaluateSingleCondition(condition, context) {
        // Dacă are sub-condiții, evaluează recursiv
        if (condition.subConditions && condition.subConditions.length > 0) {
            return this.evaluateConditions(condition.subConditions, condition.logic || 'AND', context);
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
    evaluateMinAmount(condition, context) {
        if (!condition.minAmount)
            return false;
        // Calculează subtotal fără produsele cadou
        const subtotal = context.cartItems
            .filter((item) => !item.isGift)
            .reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        return subtotal >= condition.minAmount;
    }
    /**
     * Evaluează condiția SPECIFIC_PRODUCT
     */
    evaluateSpecificProduct(condition, context) {
        if (!condition.productId)
            return false;
        const productInCart = context.cartItems.find((item) => !item.isGift && item.productId === condition.productId);
        if (!productInCart)
            return false;
        const minQty = condition.minQuantity || 1;
        return productInCart.quantity >= minQty;
    }
    /**
     * Evaluează condiția PRODUCT_CATEGORY
     */
    evaluateProductCategory(condition, context) {
        if (!condition.categoryId)
            return false;
        const categoryItems = context.cartItems.filter((item) => !item.isGift && item.product.categoryId === condition.categoryId);
        if (categoryItems.length === 0)
            return false;
        // Dacă există minCategoryAmount, verifică suma
        if (condition.minCategoryAmount) {
            const categoryTotal = categoryItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
            return categoryTotal >= condition.minCategoryAmount;
        }
        return true;
    }
    /**
     * Evaluează condiția PRODUCT_QUANTITY
     */
    evaluateProductQuantity(condition, context) {
        if (!condition.productId)
            return false;
        const productInCart = context.cartItems.find((item) => !item.isGift && item.productId === condition.productId);
        if (!productInCart)
            return false;
        const minQty = condition.minQuantity || 1;
        return productInCart.quantity >= minQty;
    }
    /**
     * Obține numărul de utilizări ale unei reguli de către un utilizator
     */
    async getUserUsageCount(userId, ruleId) {
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
    transformConditions(conditions) {
        return conditions
            .filter((c) => !c.parentConditionId) // Doar condițiile de nivel superior
            .map((condition) => this.transformSingleCondition(condition, conditions));
    }
    /**
     * Transformă o singură condiție (recursiv pentru sub-condiții)
     */
    transformSingleCondition(condition, allConditions) {
        const subConditions = allConditions
            .filter((c) => c.parentConditionId === condition.id)
            .map((sub) => this.transformSingleCondition(sub, allConditions));
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
    /**
     * Verifică dacă un utilizator a atins limita de utilizări pentru o regulă
     */
    async checkUserLimit(userId, ruleId, maxUses) {
        if (!maxUses)
            return true; // Unlimited
        const usageCount = await this.getUserUsageCount(userId, ruleId);
        return usageCount < maxUses;
    }
}
exports.conditionEvaluator = new ConditionEvaluatorService();
exports.default = exports.conditionEvaluator;
