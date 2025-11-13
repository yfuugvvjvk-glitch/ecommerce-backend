import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service';
import { RegisterSchema, LoginSchema } from '../schemas/auth.schema';

const authService = new AuthService();

export async function authRoutes(fastify: FastifyInstance) {
  // Register endpoint
  fastify.post('/register', async (request, reply) => {
    try {
      const body = RegisterSchema.parse(request.body);

      const user = await authService.register(
        body.email,
        body.password,
        body.name
      );

      reply.code(201).send({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          reply.code(409).send({ error: error.message });
        } else {
          reply.code(400).send({ error: error.message });
        }
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // Login endpoint
  fastify.post('/login', async (request, reply) => {
    try {
      const body = LoginSchema.parse(request.body);

      const result = await authService.login(body.email, body.password);

      reply.send({
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid')) {
          reply.code(401).send({ error: error.message });
        } else {
          reply.code(400).send({ error: error.message });
        }
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // Get current user endpoint (protected)
  fastify.get('/me', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);
      const user = await authService.verifyToken(token);

      const { password: _, ...userWithoutPassword } = user;

      reply.send({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof Error) {
        reply.code(401).send({ error: error.message });
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });
}
