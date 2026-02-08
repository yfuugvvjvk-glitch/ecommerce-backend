import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pump = promisify(pipeline);

export async function uploadRoutes(fastify: FastifyInstance) {
  // Upload fișiere pentru chat
  fastify.post('/chat', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Verifică tipul fișierului
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/pdf', 'text/plain'
      ];

      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({ 
          error: 'File type not allowed. Allowed types: images, videos (MP4, WebM, MOV), PDF, text files' 
        });
      }

      // Verifică dimensiunea fișierului (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (data.file.readableLength && data.file.readableLength > maxSize) {
        return reply.code(400).send({ error: 'File too large. Maximum size is 10MB' });
      }

      // Generează nume unic pentru fișier
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = path.extname(data.filename || '');
      const filename = `chat_${timestamp}_${randomString}${extension}`;

      // Creează directorul dacă nu există
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);

      // Salvează fișierul
      await pump(data.file, fs.createWriteStream(filePath));

      // Returnează URL-ul fișierului
      const fileUrl = `/uploads/chat/${filename}`;

      reply.send({
        success: true,
        fileUrl,
        filename: data.filename,
        mimetype: data.mimetype,
        size: fs.statSync(filePath).size
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      reply.code(500).send({ error: 'Failed to upload file' });
    }
  });

  // Upload avatar pentru utilizatori
  fastify.post('/avatar', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Verifică tipul fișierului (doar imagini)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({ 
          error: 'Only image files are allowed for avatars' 
        });
      }

      // Verifică dimensiunea fișierului (max 2MB pentru avatar)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (data.file.readableLength && data.file.readableLength > maxSize) {
        return reply.code(400).send({ error: 'Avatar file too large. Maximum size is 2MB' });
      }

      // Generează nume unic pentru avatar
      const timestamp = Date.now();
      const userId = request.user!.userId;
      const extension = path.extname(data.filename || '');
      const filename = `avatar_${userId}_${timestamp}${extension}`;

      // Creează directorul dacă nu există
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);

      // Salvează fișierul
      await pump(data.file, fs.createWriteStream(filePath));

      // Returnează URL-ul fișierului
      const fileUrl = `/uploads/avatars/${filename}`;

      reply.send({
        success: true,
        fileUrl,
        filename: data.filename,
        mimetype: data.mimetype,
        size: fs.statSync(filePath).size
      });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      reply.code(500).send({ error: 'Failed to upload avatar' });
    }
  });
}