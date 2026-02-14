import { FastifyInstance } from 'fastify';
import { chatService } from '../services/chat.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { chatAuthMiddleware } from '../middleware/chat-auth.middleware';

export async function chatRoutes(fastify: FastifyInstance) {
  // Obține toate camerele de chat ale utilizatorului
  fastify.get('/rooms', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const rooms = await chatService.getUserChatRooms(request.user!.userId);
      reply.send(rooms);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Creează un chat direct cu alt utilizator
  fastify.post('/direct', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { targetUserId } = request.body as any;
      
      if (!targetUserId) {
        return reply.code(400).send({ error: 'Target user ID is required' });
      }

      const chatRoom = await chatService.createDirectChat(request.user!.userId, targetUserId);
      reply.code(201).send(chatRoom);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Creează un grup de chat
  fastify.post('/group', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { name, description, memberIds } = request.body as any;
      
      if (!name) {
        return reply.code(400).send({ error: 'Group name is required' });
      }

      const chatRoom = await chatService.createGroupChat(
        request.user!.userId,
        name,
        description,
        memberIds || []
      );
      reply.code(201).send(chatRoom);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Creează un chat de support
  fastify.post('/support', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const supportRoom = await chatService.createSupportChat(request.user!.userId);
      reply.code(201).send(supportRoom);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Obține mesajele unei camere
  fastify.get('/rooms/:roomId/messages', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { roomId } = request.params as any;
      const { page = 1, limit = 50 } = request.query as any;

      const messages = await chatService.getChatMessages(
        roomId,
        request.user!.userId,
        parseInt(page),
        parseInt(limit)
      );
      reply.send(messages);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Trimite un mesaj
  fastify.post('/rooms/:roomId/messages', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { roomId } = request.params as any;
      const { content, type = 'TEXT', fileUrl, fileName } = request.body as any;

      if (!content && !fileUrl) {
        return reply.code(400).send({ error: 'Message content or file is required' });
      }

      const message = await chatService.sendMessage(
        roomId,
        request.user!.userId,
        content || '',
        type,
        fileUrl,
        fileName
      );

      // Emit message via Socket.IO (will be implemented in socket handler)
      if (fastify.io) {
        fastify.io.to(roomId).emit('new_message', message);
      }

      reply.code(201).send(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Marchează mesajele ca citite
  fastify.put('/rooms/:roomId/read', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { roomId } = request.params as any;
      const { messageIds } = request.body as any;

      const result = await chatService.markMessagesAsRead(
        roomId,
        request.user!.userId,
        messageIds
      );

      // Emit read status via Socket.IO
      if (fastify.io) {
        fastify.io.to(roomId).emit('messages_read', {
          userId: request.user!.userId,
          roomId,
          messageIds: messageIds || 'all'
        });
      }

      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Adaugă membri într-un grup
  fastify.post('/rooms/:roomId/members', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { roomId } = request.params as any;
      const { memberIds } = request.body as any;

      if (!memberIds || !Array.isArray(memberIds)) {
        return reply.code(400).send({ error: 'Member IDs array is required' });
      }

      const result = await chatService.addMembersToGroup(
        roomId,
        request.user!.userId,
        memberIds
      );

      // Emit member addition via Socket.IO
      if (fastify.io) {
        fastify.io.to(roomId).emit('members_added', {
          roomId,
          addedBy: request.user!.userId,
          memberIds
        });
      }

      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge o conversație (doar pentru direct chats și grupuri unde utilizatorul este admin)
  fastify.delete('/rooms/:roomId', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { roomId } = request.params as any;

      const result = await chatService.deleteConversation(roomId, request.user!.userId);

      // Emit conversation deletion via Socket.IO
      if (fastify.io) {
        fastify.io.to(roomId).emit('conversation_deleted', {
          roomId,
          deletedBy: request.user!.userId
        });
      }

      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Părăsește un grup
  fastify.post('/rooms/:roomId/leave', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { roomId } = request.params as any;

      const result = await chatService.leaveGroup(roomId, request.user!.userId);

      // Emit member leaving via Socket.IO
      if (fastify.io) {
        fastify.io.to(roomId).emit('member_left', {
          roomId,
          userId: request.user!.userId
        });
      }

      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Obține utilizatorii disponibili pentru chat
  fastify.get('/available-users', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const users = await chatService.getAvailableUsers(request.user!.userId);
      reply.send(users);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500).send({ error: errorMessage });
    }
  });

  // Editează un mesaj
  fastify.put('/rooms/:roomId/messages/:messageId', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { roomId, messageId } = request.params as any;
      const { content } = request.body as any;

      if (!content || !content.trim()) {
        return reply.code(400).send({ error: 'Message content is required' });
      }

      const result = await chatService.editMessage(
        messageId,
        request.user!.userId,
        content.trim()
      );

      // Emit message update via Socket.IO
      if (fastify.io) {
        fastify.io.to(roomId).emit('message_edited', {
          messageId,
          content: content.trim(),
          editedBy: request.user!.userId,
          roomId
        });
      }

      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });

  // Șterge un mesaj
  fastify.delete('/rooms/:roomId/messages/:messageId', { preHandler: [authMiddleware, chatAuthMiddleware] }, async (request, reply) => {
    try {
      const { roomId, messageId } = request.params as any;

      const result = await chatService.deleteMessage(
        messageId,
        request.user!.userId
      );

      // Emit message deletion via Socket.IO
      if (fastify.io) {
        fastify.io.to(roomId).emit('message_deleted', {
          messageId,
          deletedBy: request.user!.userId,
          roomId
        });
      }

      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.code(400).send({ error: errorMessage });
    }
  });
}