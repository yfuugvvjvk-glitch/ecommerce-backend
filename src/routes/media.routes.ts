import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size';

const prisma = new PrismaClient();

export async function mediaRoutes(fastify: FastifyInstance) {
  // Get all media files (admin only)
  fastify.get(
    '/media',
    {
      preHandler: [authMiddleware, adminMiddleware]
    },
    async (request, reply) => {
      try {
        // Obține toate fișierele din baza de date
        const mediaFiles = await prisma.media.findMany({
          orderBy: { createdAt: 'desc' }
        });

        // Dacă nu există fișiere în DB, scanează directoarele și creează înregistrări
        if (mediaFiles.length === 0) {
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
          const newFiles: any[] = [];

          const scanDirectory = async (dir: string, category: string) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            for (const item of items) {
              const fullPath = path.join(dir, item);
              const stats = fs.statSync(fullPath);
              
              if (stats.isFile()) {
                const ext = path.extname(item).toLowerCase();
                const mimeTypes: Record<string, string> = {
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
                    const imageBuffer = fs.readFileSync(fullPath);
                    const dimensions = sizeOf(imageBuffer);
                    width = dimensions.width;
                    height = dimensions.height;
                  } catch (error) {
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
                    uploadedById: (request.user as any)?.userId || 'system',
                    uploadedBy: (request.user as any)?.email || 'system',
                  }
                });

                newFiles.push(media);
              }
            }
          };

          // Scanează fiecare categorie
          for (const category of ['products', 'avatars', 'offers']) {
            await scanDirectory(path.join(uploadsDir, category), category);
          }

          return reply.send(newFiles);
        }

        reply.send(mediaFiles);
      } catch (error) {
        console.error('Error fetching media files:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error({ error: errorMessage }, 'Media fetch error');
        reply.code(500).send({ 
          error: 'Failed to fetch media files',
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    }
  );

  // Upload media files (admin only)
  fastify.post(
    '/media/upload',
    {
      preHandler: [authMiddleware, adminMiddleware]
    },
    async (request, reply) => {
      try {
        const data = await request.file();
        
        if (!data) {
          return reply.code(400).send({ error: 'No file uploaded' });
        }

        // Salvează fișierul
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'media');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filename = `${Date.now()}-${data.filename}`;
        const filepath = path.join(uploadsDir, filename);
        
        const buffer = await data.toBuffer();
        fs.writeFileSync(filepath, buffer);

        // Obține dimensiunile pentru imagini
        let width, height;
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
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
            const dimensions = sizeOf(buffer);
            width = dimensions.width;
            height = dimensions.height;
          } catch (error) {
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
            uploadedById: (request.user as any).userId,
            uploadedBy: (request.user as any).email,
          }
        });

        reply.send({
          success: true,
          file: media
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        reply.code(500).send({ error: 'Failed to upload file' });
      }
    }
  );

  // Update media metadata (admin only)
  fastify.patch(
    '/media/:id',
    {
      preHandler: [authMiddleware, adminMiddleware]
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const updateData = request.body as any;

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
      } catch (error) {
        console.error('Error updating media:', error);
        reply.code(500).send({ error: 'Failed to update media' });
      }
    }
  );

  // Get single media file (admin only)
  fastify.get(
    '/media/:id',
    {
      preHandler: [authMiddleware, adminMiddleware]
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        
        const media = await prisma.media.findUnique({
          where: { id }
        });

        if (!media) {
          return reply.code(404).send({ error: 'Media not found' });
        }

        reply.send(media);
      } catch (error) {
        console.error('Error fetching media:', error);
        reply.code(500).send({ error: 'Failed to fetch media' });
      }
    }
  );

  // Delete media file (admin only)
  fastify.delete(
    '/media/:id',
    {
      preHandler: [authMiddleware, adminMiddleware]
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        
        // Obține fișierul din DB
        const media = await prisma.media.findUnique({
          where: { id }
        });

        if (!media) {
          return reply.code(404).send({ error: 'Media not found' });
        }

        // Șterge fișierul fizic
        const filepath = path.join(process.cwd(), 'public', media.path);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }

        // Șterge înregistrarea din DB
        await prisma.media.delete({
          where: { id }
        });

        reply.send({ success: true, message: 'File deleted' });
      } catch (error) {
        console.error('Error deleting file:', error);
        reply.code(500).send({ error: 'Failed to delete file' });
      }
    }
  );

  // Bulk delete media files (admin only)
  fastify.post(
    '/media/bulk-delete',
    {
      preHandler: [authMiddleware, adminMiddleware]
    },
    async (request, reply) => {
      try {
        const { fileIds } = request.body as { fileIds: string[] };
        
        let deleted = 0;
        let failed = 0;

        for (const id of fileIds) {
          try {
            const media = await prisma.media.findUnique({
              where: { id }
            });

            if (media) {
              // Șterge fișierul fizic
              const filepath = path.join(process.cwd(), 'public', media.path);
              if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
              }

              // Șterge înregistrarea din DB
              await prisma.media.delete({
                where: { id }
              });

              deleted++;
            } else {
              failed++;
            }
          } catch (error) {
            failed++;
          }
        }

        reply.send({
          success: true,
          deleted,
          failed,
          message: `Deleted ${deleted} files, ${failed} failed`
        });
      } catch (error) {
        console.error('Error bulk deleting files:', error);
        reply.code(500).send({ error: 'Failed to bulk delete files' });
      }
    }
  );

  // Scan and detect file usage (admin only)
  fastify.get(
    '/media/:id/usage',
    {
      preHandler: [authMiddleware, adminMiddleware]
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        
        const media = await prisma.media.findUnique({
          where: { id }
        });

        if (!media) {
          return reply.code(404).send({ error: 'Media not found' });
        }

        // Scanează baza de date pentru utilizări
        const usedOnPages: string[] = [];
        
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
      } catch (error) {
        console.error('Error detecting file usage:', error);
        reply.code(500).send({ error: 'Failed to detect file usage' });
      }
    }
  );
}
