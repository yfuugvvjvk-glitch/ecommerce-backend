"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaRoutes = mediaRoutes;
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const image_size_1 = __importDefault(require("image-size"));
const prisma = new client_1.PrismaClient();
async function mediaRoutes(fastify) {
    // Get all media files (admin only)
    fastify.get('/media', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware]
    }, async (request, reply) => {
        try {
            // Obține toate fișierele din baza de date
            const mediaFiles = await prisma.media.findMany({
                orderBy: { createdAt: 'desc' }
            });
            // Dacă nu există fișiere în DB, scanează directoarele și creează înregistrări
            if (mediaFiles.length === 0) {
                const uploadsDir = path_1.default.join(process.cwd(), 'public', 'uploads');
                const newFiles = [];
                const scanDirectory = async (dir, category) => {
                    if (!fs_1.default.existsSync(dir))
                        return;
                    const items = fs_1.default.readdirSync(dir);
                    for (const item of items) {
                        const fullPath = path_1.default.join(dir, item);
                        const stats = fs_1.default.statSync(fullPath);
                        if (stats.isFile()) {
                            const ext = path_1.default.extname(item).toLowerCase();
                            const mimeTypes = {
                                '.jpg': 'image/jpeg',
                                '.jpeg': 'image/jpeg',
                                '.png': 'image/png',
                                '.gif': 'image/gif',
                                '.webp': 'image/webp',
                                '.pdf': 'application/pdf',
                            };
                            const mimeType = mimeTypes[ext] || 'application/octet-stream';
                            let width, height;
                            // Obține dimensiunile pentru imagini
                            if (mimeType.startsWith('image/')) {
                                try {
                                    const imageBuffer = fs_1.default.readFileSync(fullPath);
                                    const dimensions = (0, image_size_1.default)(imageBuffer);
                                    width = dimensions.width;
                                    height = dimensions.height;
                                }
                                catch (error) {
                                    console.error('Error getting image dimensions:', error);
                                }
                            }
                            // Creează înregistrare în DB
                            const media = await prisma.media.create({
                                data: {
                                    filename: item,
                                    originalName: item,
                                    path: `/uploads/${category}/${item}`,
                                    url: `/uploads/${category}/${item}`,
                                    mimeType,
                                    size: stats.size,
                                    width,
                                    height,
                                    category,
                                    uploadedById: request.user?.userId || 'system',
                                    uploadedBy: request.user?.email || 'system',
                                }
                            });
                            newFiles.push(media);
                        }
                    }
                };
                // Scanează fiecare categorie
                for (const category of ['products', 'avatars', 'offers']) {
                    await scanDirectory(path_1.default.join(uploadsDir, category), category);
                }
                return reply.send(newFiles);
            }
            reply.send(mediaFiles);
        }
        catch (error) {
            console.error('Error fetching media files:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            fastify.log.error({ error: errorMessage }, 'Media fetch error');
            reply.code(500).send({
                error: 'Failed to fetch media files',
                message: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error : undefined
            });
        }
    });
    // Upload media files (admin only)
    fastify.post('/media/upload', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware]
    }, async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }
            // Salvează fișierul
            const uploadsDir = path_1.default.join(process.cwd(), 'public', 'uploads', 'media');
            if (!fs_1.default.existsSync(uploadsDir)) {
                fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            }
            const filename = `${Date.now()}-${data.filename}`;
            const filepath = path_1.default.join(uploadsDir, filename);
            const buffer = await data.toBuffer();
            fs_1.default.writeFileSync(filepath, buffer);
            // Obține dimensiunile pentru imagini
            let width, height;
            const ext = path_1.default.extname(filename).toLowerCase();
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.pdf': 'application/pdf',
            };
            const mimeType = mimeTypes[ext] || 'application/octet-stream';
            if (mimeType.startsWith('image/')) {
                try {
                    const dimensions = (0, image_size_1.default)(buffer);
                    width = dimensions.width;
                    height = dimensions.height;
                }
                catch (error) {
                    console.error('Error getting image dimensions:', error);
                }
            }
            // Creează înregistrare în DB
            const media = await prisma.media.create({
                data: {
                    filename,
                    originalName: data.filename,
                    path: `/uploads/media/${filename}`,
                    url: `/uploads/media/${filename}`,
                    mimeType,
                    size: buffer.length,
                    width,
                    height,
                    category: 'media',
                    uploadedById: request.user.userId,
                    uploadedBy: request.user.email,
                }
            });
            reply.send({
                success: true,
                file: media
            });
        }
        catch (error) {
            console.error('Error uploading file:', error);
            reply.code(500).send({ error: 'Failed to upload file' });
        }
    });
    // Update media metadata (admin only)
    fastify.patch('/media/:id', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware]
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const updateData = request.body;
            const media = await prisma.media.update({
                where: { id },
                data: {
                    title: updateData.title,
                    description: updateData.description,
                    altText: updateData.altText,
                    category: updateData.category,
                    tags: updateData.tags ? JSON.stringify(updateData.tags) : null,
                    displaySize: updateData.displaySize,
                    position: updateData.position ? JSON.stringify(updateData.position) : null,
                    usedOnPages: updateData.usedOnPages ? JSON.stringify(updateData.usedOnPages) : null,
                }
            });
            reply.send({ success: true, media });
        }
        catch (error) {
            console.error('Error updating media:', error);
            reply.code(500).send({ error: 'Failed to update media' });
        }
    });
    // Get single media file (admin only)
    fastify.get('/media/:id', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware]
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const media = await prisma.media.findUnique({
                where: { id }
            });
            if (!media) {
                return reply.code(404).send({ error: 'Media not found' });
            }
            reply.send(media);
        }
        catch (error) {
            console.error('Error fetching media:', error);
            reply.code(500).send({ error: 'Failed to fetch media' });
        }
    });
    // Delete media file (admin only)
    fastify.delete('/media/:id', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware]
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            // Obține fișierul din DB
            const media = await prisma.media.findUnique({
                where: { id }
            });
            if (!media) {
                return reply.code(404).send({ error: 'Media not found' });
            }
            // Șterge fișierul fizic
            const filepath = path_1.default.join(process.cwd(), 'public', media.path);
            if (fs_1.default.existsSync(filepath)) {
                fs_1.default.unlinkSync(filepath);
            }
            // Șterge înregistrarea din DB
            await prisma.media.delete({
                where: { id }
            });
            reply.send({ success: true, message: 'File deleted' });
        }
        catch (error) {
            console.error('Error deleting file:', error);
            reply.code(500).send({ error: 'Failed to delete file' });
        }
    });
    // Bulk delete media files (admin only)
    fastify.post('/media/bulk-delete', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware]
    }, async (request, reply) => {
        try {
            const { fileIds } = request.body;
            let deleted = 0;
            let failed = 0;
            for (const id of fileIds) {
                try {
                    const media = await prisma.media.findUnique({
                        where: { id }
                    });
                    if (media) {
                        // Șterge fișierul fizic
                        const filepath = path_1.default.join(process.cwd(), 'public', media.path);
                        if (fs_1.default.existsSync(filepath)) {
                            fs_1.default.unlinkSync(filepath);
                        }
                        // Șterge înregistrarea din DB
                        await prisma.media.delete({
                            where: { id }
                        });
                        deleted++;
                    }
                    else {
                        failed++;
                    }
                }
                catch (error) {
                    failed++;
                }
            }
            reply.send({
                success: true,
                deleted,
                failed,
                message: `Deleted ${deleted} files, ${failed} failed`
            });
        }
        catch (error) {
            console.error('Error bulk deleting files:', error);
            reply.code(500).send({ error: 'Failed to bulk delete files' });
        }
    });
    // Scan and detect file usage (admin only)
    fastify.get('/media/:id/usage', {
        preHandler: [auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware]
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const media = await prisma.media.findUnique({
                where: { id }
            });
            if (!media) {
                return reply.code(404).send({ error: 'Media not found' });
            }
            // Scanează baza de date pentru utilizări
            const usedOnPages = [];
            // Verifică în produse
            const products = await prisma.dataItem.findMany({
                where: {
                    image: {
                        contains: media.filename
                    }
                },
                select: { id: true, title: true }
            });
            if (products.length > 0) {
                usedOnPages.push(...products.map(p => `Produs: ${p.title}`));
            }
            // Verifică în oferte
            const offers = await prisma.offer.findMany({
                where: {
                    image: {
                        contains: media.filename
                    }
                },
                select: { id: true, title: true }
            });
            if (offers.length > 0) {
                usedOnPages.push(...offers.map(o => `Ofertă: ${o.title}`));
            }
            // Verifică în utilizatori (avatare)
            const users = await prisma.user.findMany({
                where: {
                    avatar: {
                        contains: media.filename
                    }
                },
                select: { id: true, name: true }
            });
            if (users.length > 0) {
                usedOnPages.push(...users.map(u => `Utilizator: ${u.name}`));
            }
            // Actualizează metadata în DB
            await prisma.media.update({
                where: { id },
                data: {
                    usedOnPages: JSON.stringify(usedOnPages),
                    usageCount: usedOnPages.length
                }
            });
            reply.send({
                success: true,
                usedOnPages,
                usageCount: usedOnPages.length
            });
        }
        catch (error) {
            console.error('Error detecting file usage:', error);
            reply.code(500).send({ error: 'Failed to detect file usage' });
        }
    });
}
