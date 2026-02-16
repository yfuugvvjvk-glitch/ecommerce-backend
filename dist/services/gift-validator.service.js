"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.giftValidator = void 0;
const client_1 = require("@prisma/client");
const condition_evaluator_service_1 = require("./condition-evaluator.service");
const prisma = new client_1.PrismaClient();
class GiftValidatorService {
    /**
     * Validează selecția unui cadou înainte de adăugare în coș
     */
    async validateGiftSelection(userId, giftRuleId, productId, currentCart) {
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
            const existingGift = currentCart.find((item) => item.isGift && item.giftRuleId === giftRuleId);
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
            const evaluationResult = await condition_evaluator_service_1.conditionEvaluator.evaluateRule(ruleData, context);
            if (!evaluationResult.isEligible) {
                return {
                    isValid: false,
                    error: evaluationResult.reason || 'Conditions for this gift are not met',
                };
            }
            return { isValid: true };
        }
        catch (error) {
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
    async validateGiftStock(productId, giftRuleId) {
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
        }
        catch (error) {
            console.error('Error validating gift stock:', error);
            return false;
        }
    }
    /**
     * Validează toate cadourile din coș înainte de plasarea comenzii
     */
    async validateGiftsInOrder(userId, cartItems) {
        const invalidGifts = [];
        const errors = [];
        // Filtrează doar cadourile
        const giftItems = cartItems.filter((item) => item.isGift);
        for (const giftItem of giftItems) {
            if (!giftItem.giftRuleId) {
                invalidGifts.push(giftItem.id);
                errors.push(`Gift item ${giftItem.product.title} has no associated rule`);
                continue;
            }
            // Validează fiecare cadou
            const validation = await this.validateGiftSelection(userId, giftItem.giftRuleId, giftItem.productId, cartItems);
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
    buildEvaluationContext(cartItems, userId) {
        // Calculează subtotal fără cadouri
        const subtotal = cartItems
            .filter((item) => !item.isGift)
            .reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        // Extrage ID-urile regulilor deja folosite
        const existingGiftRuleIds = cartItems
            .filter((item) => item.isGift && item.giftRuleId)
            .map((item) => item.giftRuleId);
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
    transformRuleToData(rule) {
        return {
            id: rule.id,
            name: rule.name,
            nameEn: rule.nameEn,
            nameFr: rule.nameFr,
            nameDe: rule.nameDe,
            nameEs: rule.nameEs,
            nameIt: rule.nameIt,
            description: rule.description,
            descriptionEn: rule.descriptionEn,
            descriptionFr: rule.descriptionFr,
            descriptionDe: rule.descriptionDe,
            descriptionEs: rule.descriptionEs,
            descriptionIt: rule.descriptionIt,
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
        };
    }
    /**
     * Transformă condițiile din Prisma în format GiftConditionData
     */
    transformConditions(conditions) {
        return conditions
            .filter((c) => !c.parentConditionId)
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
}
exports.giftValidator = new GiftValidatorService();
exports.default = exports.giftValidator;
