import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { authRoutes } from './routes/auth.routes';
import { dataRoutes } from './routes/data.routes';
import { cartRoutes } from './routes/cart.routes';
import { orderRoutes } from './routes/order.routes';
import { voucherRoutes } from './routes/voucher.routes';
import { adminRoutes } from './routes/admin.routes';
import { userRoutes } from './routes/user.routes';
import { openAIRoutes } from './routes/openai.routes';
import { offerRoutes } from './routes/offer.routes';
import { categoryRoutes } from './routes/category.routes';
import { scheduleCleanupJobs } from './jobs/cleanup.job';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
  bodyLimit: 10485760, // 10MB
});

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

async function start() {
  try {
    // Register plugins
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Disable for file uploads
    });
    
    await fastify.register(cors, {
      origin: CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
    
    // Register multipart for file uploads
    await fastify.register(multipart, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    });

    // Register static file serving
    await fastify.register(fastifyStatic, {
      root: path.join(process.cwd(), 'public'),
      prefix: '/',
      decorateReply: false,
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    });
    
    // Register JWT
    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // Stricter rate limiting for auth endpoints
    await fastify.register(
      async (instance) => {
        instance.register(rateLimit, {
          max: 5,
          timeWindow: '1 minute',
        });
        instance.register(authRoutes, { prefix: '/api/auth' });
      }
    );

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register data routes
    await fastify.register(dataRoutes, { prefix: '/api/data' });
    
    // Register cart routes
    await fastify.register(cartRoutes, { prefix: '/api/cart' });
    
    // Register order routes
    await fastify.register(orderRoutes, { prefix: '/api/orders' });
    
    // Register voucher routes
    await fastify.register(voucherRoutes, { prefix: '/api/vouchers' });
    
    // Register offer routes
    await fastify.register(offerRoutes, { prefix: '/api/offers' });
    
    // Register category routes
    await fastify.register(categoryRoutes, { prefix: '/api/categories' });
    
    // Register admin routes
    await fastify.register(adminRoutes, { prefix: '/api/admin' });
    
    // Register user routes
    await fastify.register(userRoutes, { prefix: '/api/user' });
    
    // Register review routes
    const { reviewRoutes } = await import('./routes/review.routes');
    await fastify.register(reviewRoutes, { prefix: '/api' });
    
    // Register OpenAI routes
    await fastify.register(openAIRoutes, { prefix: '/api/ai' });

    // Global error handler
    fastify.setErrorHandler((error: Error, request, reply) => {
      fastify.log.error({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
      });

      if (error.name === 'ValidationError') {
        reply.code(400).send({
          error: 'Validation Error',
          details: error.message,
        });
        return;
      }

      if (error.name === 'UnauthorizedError') {
        reply.code(401).send({
          error: 'Unauthorized',
          message: error.message,
        });
        return;
      }

      if (error.name === 'NotFoundError') {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
        });
        return;
      }

      if (error.name === 'ConflictError') {
        reply.code(409).send({
          error: 'Conflict',
          message: error.message,
        });
        return;
      }

      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    });

    // Start server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    
    // Schedule cleanup jobs
    scheduleCleanupJobs();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
