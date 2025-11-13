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

    const total = cartItems.reduce(
      (sum, item) => sum + item.dataItem.price * item.quantity,
      0
    );

    return {
      items: cartItems,
      total,
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  // Add item to cart
  async addToCart(userId: string, dataItemId: string, quantity: number = 1) {
    // Check if product exists and has stock
    const product = await prisma.dataItem.findUnique({
      where: { id: dataItemId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.stock < quantity) {
      throw new Error('Insufficient stock');
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_dataItemId: {
          userId,
          dataItemId,
        },
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        throw new Error('Insufficient stock');
      }

      return await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { dataItem: { include: { category: true } } },
      });
    }

    // Create new cart item
    return await prisma.cartItem.create({
      data: {
        userId,
        dataItemId,
        quantity,
      },
      include: { dataItem: { include: { category: true } } },
    });
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

    if (cartItem.dataItem.stock < quantity) {
      throw new Error('Insufficient stock');
    }

    if (quantity <= 0) {
      return await this.removeFromCart(userId, cartItemId);
    }

    return await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { dataItem: { include: { category: true } } },
    });
  }

  // Remove item from cart
  async removeFromCart(userId: string, cartItemId: string) {
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    return await prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  // Clear cart
  async clearCart(userId: string) {
    return await prisma.cartItem.deleteMany({
      where: { userId },
    });
  }
}
