import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import emailService, { PasswordChangeDetails } from './email.service';

const prisma = new PrismaClient();

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        county: true,
        street: true,
        streetNumber: true,
        addressDetails: true,
        avatar: true,
        role: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    county?: string;
    street?: string;
    streetNumber?: string;
    addressDetails?: string;
    avatar?: string;
    locale?: string;
  }) {
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        county: true,
        street: true,
        streetNumber: true,
        addressDetails: true,
        avatar: true,
        role: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        county: true,
        street: true,
        streetNumber: true,
        addressDetails: true,
        avatar: true,
        role: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteAvatar(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        county: true,
        street: true,
        streetNumber: true,
        addressDetails: true,
        avatar: true,
        role: true,
        locale: true,
      },
    });
  }

  async updateLocale(userId: string, locale: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { locale },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        county: true,
        street: true,
        streetNumber: true,
        addressDetails: true,
        avatar: true,
        role: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Utilizatorul nu a fost găsit');
    }

    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(oldPassword, user.password);

    if (!isValid) {
      throw new Error('Parola veche este incorectă');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Send password change notification
    const details: PasswordChangeDetails = {
      timestamp: new Date(),
      ipAddress,
      deviceInfo: this.extractDeviceInfo(userAgent),
      userAgent,
    };

    await emailService.sendPasswordChangeNotification(user.email, details);

    return { message: 'Parola a fost schimbată cu succes' };
  }

  /**
   * Extract device information from user agent string
   */
  private extractDeviceInfo(userAgent: string): string {
    if (!userAgent) {
      return 'Dispozitiv necunoscut';
    }

    // Detect mobile devices
    if (/mobile/i.test(userAgent)) {
      if (/android/i.test(userAgent)) {
        return 'Dispozitiv Android';
      } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        return 'Dispozitiv iOS';
      }
      return 'Dispozitiv mobil';
    }

    // Detect desktop OS
    if (/windows/i.test(userAgent)) {
      return 'Computer Windows';
    } else if (/macintosh|mac os x/i.test(userAgent)) {
      return 'Computer Mac';
    } else if (/linux/i.test(userAgent)) {
      return 'Computer Linux';
    }

    return 'Computer';
  }

  // Favorites
  async getFavorites(userId: string) {
    return await prisma.favorite.findMany({
      where: { userId },
      include: { dataItem: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addFavorite(userId: string, dataItemId: string) {
    return await prisma.favorite.create({
      data: { userId, dataItemId },
      include: { dataItem: { include: { category: true } } },
    });
  }

  async removeFavorite(userId: string, dataItemId: string) {
    // Check if favorite exists first
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_dataItemId: { userId, dataItemId },
      },
    });

    if (!favorite) {
      throw new Error('Produsul nu este în lista de favorite');
    }

    return await prisma.favorite.delete({
      where: {
        userId_dataItemId: { userId, dataItemId },
      },
    });
  }

  async checkFavorite(userId: string, dataItemId: string) {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_dataItemId: { userId, dataItemId },
      },
    });
    return !!favorite;
  }

  // Reviews
  async getMyReviews(userId: string) {
    return await prisma.review.findMany({
      where: { userId },
      include: { dataItem: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReview(userId: string, data: {
    dataItemId: string;
    rating: number;
    comment: string;
  }) {
    return await prisma.review.create({
      data: {
        userId,
        dataItemId: data.dataItemId,
        rating: data.rating,
        comment: data.comment,
      },
      include: { dataItem: { include: { category: true } } },
    });
  }

  async updateReview(reviewId: string, userId: string, data: {
    rating?: number;
    comment?: string;
  }) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, userId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    return await prisma.review.update({
      where: { id: reviewId },
      data,
    });
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, userId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    return await prisma.review.delete({
      where: { id: reviewId },
    });
  }
}
