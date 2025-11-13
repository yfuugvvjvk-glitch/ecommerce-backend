import { FastifyInstance } from 'fastify';
import { DataService } from '../services/data.service';
import {
  CreateDataSchema,
  UpdateDataSchema,
  QueryParamsSchema,
} from '../schemas/data.schema';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadProductImage } from '../middleware/upload.middleware';

const dataService = new DataService();

export async function dataRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authMiddleware);

  // GET /api/data - List all data items with pagination
  fastify.get('/', async (request, reply) => {
    try {
      const query = QueryParamsSchema.parse(request.query);
      const userId = request.user!.userId;
      const userRole = request.user!.role || 'user';

      const result = await dataService.findAll(userId, userRole, query);

      reply.send(result);
    } catch (error) {
      if (error instanceof Error) {
        reply.code(400).send({ error: error.message });
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // GET /api/data/:id - Get single data item
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;
      const userRole = request.user!.role || 'user';

      const item = await dataService.findById(id, userId, userRole);

      if (!item) {
        reply.code(404).send({ error: 'Data item not found' });
        return;
      }

      reply.send({ data: item });
    } catch (error) {
      if (error instanceof Error) {
        reply.code(400).send({ error: error.message });
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // POST /api/data - Create new data item
  fastify.post('/', async (request, reply) => {
    try {
      const body = CreateDataSchema.parse(request.body);
      const userId = request.user!.userId;

      const item = await dataService.create(body, userId);

      reply.code(201).send({ data: item });
    } catch (error) {
      if (error instanceof Error) {
        reply.code(400).send({ error: error.message });
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // PUT /api/data/:id - Update data item
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = UpdateDataSchema.parse(request.body);
      const userId = request.user!.userId;

      const item = await dataService.update(id, body, userId);

      reply.send({ data: item });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          reply.code(404).send({ error: error.message });
        } else {
          reply.code(400).send({ error: error.message });
        }
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // DELETE /api/data/:id - Delete data item
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;

      await dataService.delete(id, userId);

      reply.send({ message: 'Data item deleted successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          reply.code(404).send({ error: error.message });
        } else {
          reply.code(400).send({ error: error.message });
        }
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // POST /api/data/upload-image - Upload product image
  fastify.post('/upload-image', async (request, reply) => {
    try {
      const uploadedFile = await uploadProductImage(request, reply);
      reply.send({
        message: 'Image uploaded successfully',
        url: uploadedFile.url,
      });
    } catch (error: any) {
      if (!reply.sent) {
        reply.code(400).send({ error: error.message });
      }
    }
  });
}
