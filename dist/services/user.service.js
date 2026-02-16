"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const auth_1 = require("../utils/auth");
const email_service_1 = __importDefault(require("./email.service"));
const prisma = new client_1.PrismaClient();
class UserService {
    async getProfile(userId) {
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
    async updateProfile(userId, data) {
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
    async uploadAvatar(userId, avatarUrl) {
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
    async deleteAvatar(userId) {
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
    async updateLocale(userId, locale) {
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
    async changePassword(userId, oldPassword, newPassword, ipAddress, userAgent) {
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
        const hashedPassword = await (0, auth_1.hashPassword)(newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        // Send password change notification
        const details = {
            timestamp: new Date(),
            ipAddress,
            deviceInfo: this.extractDeviceInfo(userAgent),
            userAgent,
        };
        await email_service_1.default.sendPasswordChangeNotification(user.email, details);
        return { message: 'Parola a fost schimbată cu succes' };
    }
    /**
     * Extract device information from user agent string
     */
    extractDeviceInfo(userAgent) {
        if (!userAgent) {
            return 'Dispozitiv necunoscut';
        }
        // Detect mobile devices
        if (/mobile/i.test(userAgent)) {
            if (/android/i.test(userAgent)) {
                return 'Dispozitiv Android';
            }
            else if (/iphone|ipad|ipod/i.test(userAgent)) {
                return 'Dispozitiv iOS';
            }
            return 'Dispozitiv mobil';
        }
        // Detect desktop OS
        if (/windows/i.test(userAgent)) {
            return 'Computer Windows';
        }
        else if (/macintosh|mac os x/i.test(userAgent)) {
            return 'Computer Mac';
        }
        else if (/linux/i.test(userAgent)) {
            return 'Computer Linux';
        }
        return 'Computer';
    }
    // Favorites
    async getFavorites(userId) {
        return await prisma.favorite.findMany({
            where: { userId },
            include: { dataItem: { include: { category: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addFavorite(userId, dataItemId) {
        return await prisma.favorite.create({
            data: { userId, dataItemId },
            include: { dataItem: { include: { category: true } } },
        });
    }
    async removeFavorite(userId, dataItemId) {
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
    async checkFavorite(userId, dataItemId) {
        const favorite = await prisma.favorite.findUnique({
            where: {
                userId_dataItemId: { userId, dataItemId },
            },
        });
        return !!favorite;
    }
    // Reviews
    async getMyReviews(userId) {
        return await prisma.review.findMany({
            where: { userId },
            include: { dataItem: { include: { category: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createReview(userId, data) {
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
    async updateReview(reviewId, userId, data) {
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
    async deleteReview(reviewId, userId) {
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
exports.UserService = UserService;
