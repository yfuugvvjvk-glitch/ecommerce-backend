"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = uploadRoutes;
const auth_middleware_1 = require("../middleware/auth.middleware");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const stream_1 = require("stream");
const util_1 = require("util");
const pump = (0, util_1.promisify)(stream_1.pipeline);
async function uploadRoutes(fastify) {
    // Upload fișiere pentru chat
    fastify.post('/chat', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
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
            const extension = path_1.default.extname(data.filename || '');
            const filename = `chat_${timestamp}_${randomString}${extension}`;
            // Creează directorul dacă nu există
            const uploadDir = path_1.default.join(process.cwd(), 'public', 'uploads', 'chat');
            if (!fs_1.default.existsSync(uploadDir)) {
                fs_1.default.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path_1.default.join(uploadDir, filename);
            // Salvează fișierul
            await pump(data.file, fs_1.default.createWriteStream(filePath));
            // Returnează URL-ul fișierului
            const fileUrl = `/uploads/chat/${filename}`;
            reply.send({
                success: true,
                fileUrl,
                filename: data.filename,
                mimetype: data.mimetype,
                size: fs_1.default.statSync(filePath).size
            });
        }
        catch (error) {
            console.error('Error uploading file:', error);
            reply.code(500).send({ error: 'Failed to upload file' });
        }
    });
    // Upload avatar pentru utilizatori
    fastify.post('/avatar', { preHandler: auth_middleware_1.authMiddleware }, async (request, reply) => {
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
            const userId = request.user.userId;
            const extension = path_1.default.extname(data.filename || '');
            const filename = `avatar_${userId}_${timestamp}${extension}`;
            // Creează directorul dacă nu există
            const uploadDir = path_1.default.join(process.cwd(), 'public', 'uploads', 'avatars');
            if (!fs_1.default.existsSync(uploadDir)) {
                fs_1.default.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path_1.default.join(uploadDir, filename);
            // Salvează fișierul
            await pump(data.file, fs_1.default.createWriteStream(filePath));
            // Returnează URL-ul fișierului
            const fileUrl = `/uploads/avatars/${filename}`;
            reply.send({
                success: true,
                fileUrl,
                filename: data.filename,
                mimetype: data.mimetype,
                size: fs_1.default.statSync(filePath).size
            });
        }
        catch (error) {
            console.error('Error uploading avatar:', error);
            reply.code(500).send({ error: 'Failed to upload avatar' });
        }
    });
}
