import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/auth';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    request.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role || 'user',
    };
  } catch (error) {
    reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

export const authenticateToken = authMiddleware;
