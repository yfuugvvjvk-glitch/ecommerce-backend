"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = chatRoutes;
const chat_service_1 = require("../services/chat.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const chat_auth_middleware_1 = require("../middleware/chat-auth.middleware");
async function chatRoutes(fastify) {
    // Obține toate camerele de chat ale utilizatorului
    fastify.get('/rooms', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const rooms = await chat_service_1.chatService.getUserChatRooms(request.user.userId);
            reply.send(rooms);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Creează un chat direct cu alt utilizator
    fastify.post('/direct', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { targetUserId } = request.body;
            if (!targetUserId) {
                return reply.code(400).send({ error: 'Target user ID is required' });
            }
            const chatRoom = await chat_service_1.chatService.createDirectChat(request.user.userId, targetUserId);
            reply.code(201).send(chatRoom);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Creează un grup de chat
    fastify.post('/group', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { name, description, memberIds } = request.body;
            if (!name) {
                return reply.code(400).send({ error: 'Group name is required' });
            }
            const chatRoom = await chat_service_1.chatService.createGroupChat(request.user.userId, name, description, memberIds || []);
            reply.code(201).send(chatRoom);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Creează un chat de support
    fastify.post('/support', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const supportRoom = await chat_service_1.chatService.createSupportChat(request.user.userId);
            reply.code(201).send(supportRoom);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Obține mesajele unei camere
    fastify.get('/rooms/:roomId/messages', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { roomId } = request.params;
            const { page = 1, limit = 50 } = request.query;
            const messages = await chat_service_1.chatService.getChatMessages(roomId, request.user.userId, parseInt(page), parseInt(limit));
            reply.send(messages);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Trimite un mesaj
    fastify.post('/rooms/:roomId/messages', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { roomId } = request.params;
            const { content, type = 'TEXT', fileUrl, fileName } = request.body;
            if (!content && !fileUrl) {
                return reply.code(400).send({ error: 'Message content or file is required' });
            }
            const message = await chat_service_1.chatService.sendMessage(roomId, request.user.userId, content || '', type, fileUrl, fileName);
            // Emit message via Socket.IO (will be implemented in socket handler)
            if (fastify.io) {
                fastify.io.to(roomId).emit('new_message', message);
            }
            reply.code(201).send(message);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Marchează mesajele ca citite
    fastify.put('/rooms/:roomId/read', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { roomId } = request.params;
            const { messageIds } = request.body;
            const result = await chat_service_1.chatService.markMessagesAsRead(roomId, request.user.userId, messageIds);
            // Emit read status via Socket.IO
            if (fastify.io) {
                fastify.io.to(roomId).emit('messages_read', {
                    userId: request.user.userId,
                    roomId,
                    messageIds: messageIds || 'all'
                });
            }
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Adaugă membri într-un grup
    fastify.post('/rooms/:roomId/members', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { roomId } = request.params;
            const { memberIds } = request.body;
            if (!memberIds || !Array.isArray(memberIds)) {
                return reply.code(400).send({ error: 'Member IDs array is required' });
            }
            const result = await chat_service_1.chatService.addMembersToGroup(roomId, request.user.userId, memberIds);
            // Emit member addition via Socket.IO
            if (fastify.io) {
                fastify.io.to(roomId).emit('members_added', {
                    roomId,
                    addedBy: request.user.userId,
                    memberIds
                });
            }
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge o conversație (doar pentru direct chats și grupuri unde utilizatorul este admin)
    fastify.delete('/rooms/:roomId', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { roomId } = request.params;
            const result = await chat_service_1.chatService.deleteConversation(roomId, request.user.userId);
            // Emit conversation deletion via Socket.IO
            if (fastify.io) {
                fastify.io.to(roomId).emit('conversation_deleted', {
                    roomId,
                    deletedBy: request.user.userId
                });
            }
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Părăsește un grup
    fastify.post('/rooms/:roomId/leave', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { roomId } = request.params;
            const result = await chat_service_1.chatService.leaveGroup(roomId, request.user.userId);
            // Emit member leaving via Socket.IO
            if (fastify.io) {
                fastify.io.to(roomId).emit('member_left', {
                    roomId,
                    userId: request.user.userId
                });
            }
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Obține utilizatorii disponibili pentru chat
    fastify.get('/available-users', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const users = await chat_service_1.chatService.getAvailableUsers(request.user.userId);
            reply.send(users);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(500).send({ error: errorMessage });
        }
    });
    // Editează un mesaj
    fastify.put('/rooms/:roomId/messages/:messageId', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { roomId, messageId } = request.params;
            const { content } = request.body;
            if (!content || !content.trim()) {
                return reply.code(400).send({ error: 'Message content is required' });
            }
            const result = await chat_service_1.chatService.editMessage(messageId, request.user.userId, content.trim());
            // Emit message update via Socket.IO
            if (fastify.io) {
                fastify.io.to(roomId).emit('message_edited', {
                    messageId,
                    content: content.trim(),
                    editedBy: request.user.userId,
                    roomId
                });
            }
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
    // Șterge un mesaj
    fastify.delete('/rooms/:roomId/messages/:messageId', { preHandler: [auth_middleware_1.authMiddleware, chat_auth_middleware_1.chatAuthMiddleware] }, async (request, reply) => {
        try {
            const { roomId, messageId } = request.params;
            const result = await chat_service_1.chatService.deleteMessage(messageId, request.user.userId);
            // Emit message deletion via Socket.IO
            if (fastify.io) {
                fastify.io.to(roomId).emit('message_deleted', {
                    messageId,
                    deletedBy: request.user.userId,
                    roomId
                });
            }
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            reply.code(400).send({ error: errorMessage });
        }
    });
}
