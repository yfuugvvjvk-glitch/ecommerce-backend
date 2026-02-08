"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const user_service_1 = require("../services/user.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const userService = new user_service_1.UserService();
async function userRoutes(fastify) {
    // Profile
    fastify.get('/profile', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const profile = await userService.getProfile(request.user.userId);
            reply.send(profile);
        }
        catch (error) {
            reply.code(404).send({ error: error.message });
        }
    });
    fastify.put('/profile', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const data = request.body;
            const profile = await userService.updateProfile(request.user.userId, data);
            reply.send(profile);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Avatar upload
    fastify.post('/avatar', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const uploadedFile = await (0, upload_middleware_1.uploadAvatar)(request, reply);
            const profile = await userService.uploadAvatar(request.user.userId, uploadedFile.url);
            reply.send({
                message: 'Avatar uploaded successfully',
                avatar: uploadedFile.url,
                profile,
            });
        }
        catch (error) {
            if (!reply.sent) {
                reply.code(400).send({ error: error.message });
            }
        }
    });
    fastify.delete('/avatar', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const profile = await userService.deleteAvatar(request.user.userId);
            reply.send({
                message: 'Avatar deleted successfully',
                profile,
            });
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Update locale
    fastify.put('/locale', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { locale } = request.body;
            if (!locale || !['ro', 'en'].includes(locale)) {
                reply.code(400).send({ error: 'Invalid locale. Must be "ro" or "en"' });
                return;
            }
            const profile = await userService.updateLocale(request.user.userId, locale);
            reply.send(profile);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    fastify.post('/change-password', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { oldPassword, newPassword } = request.body;
            const result = await userService.changePassword(request.user.userId, oldPassword, newPassword);
            reply.send(result);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    // Favorites
    fastify.get('/favorites', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const favorites = await userService.getFavorites(request.user.userId);
            reply.send(favorites);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get favorites' });
        }
    });
    fastify.get('/favorites/check/:dataItemId', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { dataItemId } = request.params;
            const isFavorite = await userService.checkFavorite(request.user.userId, dataItemId);
            reply.send({ isFavorite });
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to check favorite' });
        }
    });
    fastify.post('/favorites', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { dataItemId } = request.body;
            if (!dataItemId) {
                return reply.code(400).send({ error: 'dataItemId is required' });
            }
            const favorite = await userService.addFavorite(request.user.userId, dataItemId);
            reply.send(favorite);
        }
        catch (error) {
            console.error('Add favorite error:', error);
            reply.code(400).send({ error: error.message });
        }
    });
    fastify.delete('/favorites/:dataItemId', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { dataItemId } = request.params;
            const userId = request.user.userId;
            console.log('Removing favorite:', { userId, dataItemId });
            await userService.removeFavorite(userId, dataItemId);
            reply.send({ message: 'Removed from favorites' });
        }
        catch (error) {
            console.error('Remove favorite error:', error);
            reply.code(400).send({ error: error.message || 'Failed to remove favorite' });
        }
    });
    // Reviews
    fastify.get('/reviews', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const reviews = await userService.getMyReviews(request.user.userId);
            reply.send(reviews);
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to get reviews' });
        }
    });
    fastify.post('/reviews', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const data = request.body;
            const review = await userService.createReview(request.user.userId, data);
            reply.code(201).send(review);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    fastify.put('/reviews/:id', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const review = await userService.updateReview(id, request.user.userId, data);
            reply.send(review);
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
    fastify.delete('/reviews/:id', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            await userService.deleteReview(id, request.user.userId);
            reply.send({ message: 'Review deleted' });
        }
        catch (error) {
            reply.code(400).send({ error: error.message });
        }
    });
}
