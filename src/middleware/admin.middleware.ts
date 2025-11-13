import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    if (!request.user) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
    });

    if (!user || user.role !== 'admin') {
      reply.code(403).send({ error: 'Forbidden - Admin access required' });
      return;
    }
  } catch (error) {
    reply.code(500).send({ error: 'Internal server error' });
  }
}

export const requireAdmin = adminMiddleware;
