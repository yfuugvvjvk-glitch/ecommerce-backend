import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CartService {
  // Get user's cart
  async getCart(userId: string) {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        dataItem: { include: { category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse availableQuantities for each item
    const itemsWithParsedQuantities = cartItems.map(item => ({
      ...item,
      dataItem: {
        ...item.dataItem,
        availableQuantities: item.dataItem.availableQuantities 
          ? (typeof item.dataItem.availableQuantities === 'string' 
              ? JSON.parse(item.dataItem.availableQuantities) 
              : item.dataItem.availableQuantities)
          : [1]
      }
    }));

    const total = itemsWithParsedQuantities.reduce(
      (sum, item) => {
        // Exclude gift items from total calculation
        if (item.isGift) return sum;
        return sum + item.dataItem.price * item.quantity;
      },
      0
    );

    const result = {
      items: itemsWithParsedQuantities,
      total,
      itemCount: itemsWithParsedQuantities.length, // Numărul de produse distincte
    };

    return result;
  }

  // Add item to cart
  async addToCart(userId: string, dataItemId: string, quantity: number = 1) {
    // Check if product exists and has available stock
    const product = await prisma.dataItem.findUnique({
      where: { id: dataItemId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Check available stock (not reserved)
    // Pentru produse per_unit (kg, litri), nu verificăm stocul strict
    // Pentru produse fixed (bucăți), verificăm stocul
    const availableStock = product.availableStock || product.stock;
    
    // Doar pentru produse cu preț fix verificăm stocul strict
    if (product.priceType === 'fixed' && availableStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`);
    }
    
    // Pentru per_unit, verificăm doar dacă există stoc disponibil (> 0)
    if (product.priceType === 'per_unit' && availableStock <= 0) {
      throw new Error('Product out of stock');
    }

    // Check if item already in cart (as non-gift)
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_dataItemId_isGift: {
          userId,
          dataItemId,
          isGift: false,
        },
      },
    });

    if (existingItem) {
      // Update quantity - replace instead of adding
      const newQuantity = quantity; // Use the new quantity directly, don't add to existing
      
      // Verificare stoc pentru update
      if (product.priceType === 'fixed' && availableStock < newQuantity) {
        throw new Error(`Insufficient stock. Available: ${availableStock}, Total requested: ${newQuantity}`);
      }

      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { dataItem: { include: { category: true } } },
      });
      return updatedItem;
    }

    // Create new cart item
    const newItem = await prisma.cartItem.create({
      data: {
        userId,
        dataItemId,
        quantity,
      },
      include: { dataItem: { include: { category: true } } },
    });
    return newItem;
  }

  // Update cart item quantity
  async updateQuantity(userId: string, cartItemId: string, quantity: number) {
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
      include: { dataItem: { include: { category: true } } },
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    // Check available stock
    const availableStock = cartItem.dataItem.availableStock || cartItem.dataItem.stock;
    
    // Verificare stoc diferită pentru per_unit vs fixed
    if (cartItem.dataItem.priceType === 'fixed' && availableStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`);
    }
    
    if (cartItem.dataItem.priceType === 'per_unit' && availableStock <= 0) {
      throw new Error('Product out of stock');
    }

    if (quantity <= 0) {
      const result = await this.removeFromCart(userId, cartItemId);
      // Reevaluează cadourile după eliminare
      await this.reevaluateGifts(userId);
      return result;
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { dataItem: { include: { category: true } } },
    });

    // Reevaluează cadourile după modificare
    await this.reevaluateGifts(userId);

    return updatedItem;
  }

  // Remove item from cart
  async removeFromCart(userId: string, cartItemId: string) {
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    const result = await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    // Reevaluează cadourile după eliminare (doar dacă nu e cadou)
    if (!cartItem.isGift) {
      await this.reevaluateGifts(userId);
    }

    return result;
  }

  // Clear cart
  async clearCart(userId: string) {
    return await prisma.cartItem.deleteMany({
      where: { userId },
    });
  }

  // ============================================
  // GIFT SYSTEM METHODS
  // ============================================

  /**
   * Adaugă un produs cadou în coș
   */
  async addGiftProduct(userId: string, giftRuleId: string, productId: string) {
    // Import services (lazy to avoid circular dependencies)
    const { giftValidator } = await import('./gift-validator.service');
    
    // 1. Obține coșul curent
    const currentCart = await this.getCartItemsWithProduct(userId);

    // 2. Validează selecția
    const validation = await giftValidator.validateGiftSelection(
      userId,
      giftRuleId,
      productId,
      currentCart
    );

    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid gift selection');
    }

    // 3. Adaugă în coș cu isGift = true
    const cartItem = await prisma.cartItem.create({
      data: {
        userId,
        dataItemId: productId,
        quantity: 1,
        isGift: true,
        giftRuleId,
      },
      include: {
        dataItem: { include: { category: true } },
        giftRule: true,
      },
    });

    // 4. Returnează coșul actualizat
    const cart = await this.getCart(userId);

    return {
      success: true,
      message: 'Gift added to cart',
      cartItem,
      cart,
    };
  }

  /**
   * Elimină un produs cadou din coș
   */
  async removeGiftProduct(userId: string, cartItemId: string) {
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId, isGift: true },
    });

    if (!cartItem) {
      throw new Error('Gift item not found');
    }

    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return {
      success: true,
      message: 'Gift product removed from cart',
    };
  }

  /**
   * Reevaluează cadourile după modificarea coșului
   */
  async reevaluateGifts(userId: string) {
    // Import services (lazy to avoid circular dependencies)
    const { conditionEvaluator } = await import('./condition-evaluator.service');
    const { giftRuleService } = await import('./gift-rule.service');

    const cartItems = await this.getCartItemsWithProduct(userId);
    const giftItems = cartItems.filter((item) => item.isGift);

    const removedGifts: Array<{
      cartItemId: string;
      productName: string;
      reason: string;
    }> = [];

    // Verifică fiecare cadou dacă mai este valid
    for (const giftItem of giftItems) {
      if (!giftItem.giftRuleId) continue;

      const context = this.buildEvaluationContext(cartItems, userId);
      const rule = await giftRuleService.getRule(giftItem.giftRuleId);
      
      if (!rule) {
        // Regula nu mai există, elimină cadoul
        await prisma.cartItem.delete({ where: { id: giftItem.id } });
        removedGifts.push({
          cartItemId: giftItem.id,
          productName: giftItem.product.title,
          reason: 'Gift rule no longer exists',
        });
        continue;
      }

      const result = await conditionEvaluator.evaluateRule(rule as any, context);

      if (!result.isEligible) {
        // Elimină cadoul
        await prisma.cartItem.delete({ where: { id: giftItem.id } });
        removedGifts.push({
          cartItemId: giftItem.id,
          productName: giftItem.product.title,
          reason: result.reason || 'Conditions no longer met',
        });
      }
    }

    // Obține reguli eligibile
    const eligibleRules = await this.getEligibleGifts(userId);

    return { removedGifts, eligibleRules };
  }

  /**
   * Obține cadourile eligibile pentru utilizatorul curent
   */
  async getEligibleGifts(userId: string) {
    // Import services (lazy to avoid circular dependencies)
    const { conditionEvaluator } = await import('./condition-evaluator.service');

    const cartItems = await this.getCartItemsWithProduct(userId);
    const context = this.buildEvaluationContext(cartItems, userId);

    // Evaluează toate regulile active
    const results = await conditionEvaluator.evaluateAllRules(context);

    // Filtrează doar regulile eligibile
    const eligibleRules = results
      .filter((result) => result.isEligible)
      .map((result) => ({
        rule: {
          id: result.rule.id,
          name: result.rule.name,
          description: result.rule.description,
        },
        availableProducts: result.rule.giftProducts
          .filter((gp) => gp.product.stock > 0)
          .map((gp) => ({
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
          })),
      }))
      .filter((rule) => rule.availableProducts.length > 0);

    return eligibleRules;
  }

  /**
   * Obține items din coș cu detalii complete despre produs
   */
  private async getCartItemsWithProduct(userId: string) {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        dataItem: {
          include: {
            category: true,
          },
        },
      },
    });

    return cartItems.map((item) => ({
      id: item.id,
      productId: item.dataItemId,
      quantity: item.quantity,
      isGift: item.isGift,
      giftRuleId: item.giftRuleId,
      product: {
        id: item.dataItem.id,
        title: item.dataItem.title,
        price: item.dataItem.price,
        categoryId: item.dataItem.categoryId,
        stock: item.dataItem.stock,
      },
    }));
  }

  /**
   * Construiește contextul de evaluare pentru reguli de cadou
   */
  private buildEvaluationContext(cartItems: any[], userId: string) {
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
}
