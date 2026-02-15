import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { validateEnv } from './utils/env-validator';
import { verifyDatabaseConnection, disconnectDatabase } from './utils/prisma';
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
import { chatRoutes } from './routes/chat.routes';
import { publicRoutes } from './routes/public.routes';
import { initializeRealtimeService } from './services/realtime.service';
import { scheduleCurrencyUpdate, updateCurrenciesOnStartup } from './jobs/currency-update.job';
import { inventoryRoutes } from './routes/inventory.routes';

// Validează variabilele de mediu la pornire
const env = validateEnv();

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV !== 'production'
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
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
});

const PORT = env.PORT;
const CORS_ORIGIN = env.CORS_ORIGIN;

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 ${signal} primit, închid serverul...`);
  
  try {
    await fastify.close();
    await disconnectDatabase();
    console.log('✅ Server închis cu succes');
    process.exit(0);
  } catch (error) {
    console.error('❌ Eroare la închiderea serverului:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function start() {
  try {
    console.log('🚀 Pornire server...');
    
    // 1. Verifică conexiunea la baza de date
    console.log('📊 Verificare conexiune bază de date...');
    const dbConnected = await verifyDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Nu se poate conecta la baza de date');
    }

    // 2. Register plugins
    console.log('🔌 Înregistrare plugin-uri...');
    
    await fastify.register(helmet, {
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    });
    
    await fastify.register(cors, {
      origin: [CORS_ORIGIN, 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Set UTF-8 charset for all JSON responses
    fastify.addHook('onSend', async (request, reply, payload) => {
      if (reply.getHeader('content-type')?.toString().includes('application/json')) {
        reply.header('content-type', 'application/json; charset=utf-8');
      }
      return payload;
    });
    
    await fastify.register(multipart, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    });

    const formbody = await import('@fastify/formbody');
    await fastify.register(formbody.default);

    await fastify.register(fastifyStatic, {
      root: path.join(process.cwd(), 'public'),
      prefix: '/',
      decorateReply: false,
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    });
    
    await fastify.register(jwt, {
      secret: env.JWT_SECRET,
    });

    await fastify.register(rateLimit, {
      max: 500,
      timeWindow: '1 minute',
    });

    // 3. Initialize Socket.IO BEFORE routes
    console.log('💬 Inițializare Socket.IO...');
    const io = new SocketIOServer(fastify.server, {
      cors: {
        origin: [CORS_ORIGIN, 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    fastify.decorate('io', io);

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = fastify.jwt.verify(token) as any;
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;
        socket.userRole = decoded.role;
        
        // Blochează utilizatorii guest de la Socket.IO chat
        if (decoded.role === 'guest') {
          return next(new Error('Chat access denied for guest users'));
        }
        
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.userEmail} (${socket.userId})`);
      socket.join(`user_${socket.userId}`);

      socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        console.log(`👥 User ${socket.userEmail} joined room: ${roomId}`);
      });

      socket.on('leave_room', (roomId: string) => {
        socket.leave(roomId);
        console.log(`👋 User ${socket.userEmail} left room: ${roomId}`);
      });

      socket.on('typing_start', (data: { roomId: string }) => {
        socket.to(data.roomId).emit('user_typing', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          roomId: data.roomId
        });
      });

      socket.on('typing_stop', (data: { roomId: string }) => {
        socket.to(data.roomId).emit('user_stopped_typing', {
          userId: socket.userId,
          roomId: data.roomId
        });
      });

      socket.on('user_online', () => {
        socket.broadcast.emit('user_status_change', {
          userId: socket.userId,
          status: 'online'
        });
      });

      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.userEmail} (${socket.userId})`);
        socket.broadcast.emit('user_status_change', {
          userId: socket.userId,
          status: 'offline'
        });
      });
    });

    initializeRealtimeService(fastify);

    // 4. Health check endpoints
    fastify.get('/health', async () => {
      const dbHealthy = await verifyDatabaseConnection();
      return { 
        status: dbHealthy ? 'ok' : 'degraded',
        database: dbHealthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: env.NODE_ENV
      };
    });

    fastify.get('/ping', async () => {
      return { pong: true, timestamp: new Date().toISOString() };
    });

    // 5. Register routes with error handling
    console.log('🛣️  Înregistrare rute...');
    
    try {
      await fastify.register(
        async (instance) => {
          instance.register(rateLimit, {
            max: 10,
            timeWindow: '1 minute',
          });
          instance.register(authRoutes, { prefix: '/api/auth' });
        }
      );

      await fastify.register(publicRoutes, { prefix: '/api/public' });
      await fastify.register(dataRoutes, { prefix: '/api/data' });
      await fastify.register(cartRoutes, { prefix: '/api/cart' });
      await fastify.register(orderRoutes, { prefix: '/api/orders' });
      await fastify.register(voucherRoutes, { prefix: '/api/vouchers' });
      await fastify.register(offerRoutes, { prefix: '/api/offers' });
      await fastify.register(categoryRoutes, { prefix: '/api/categories' });
      await fastify.register(adminRoutes, { prefix: '/api/admin' });
      await fastify.register(userRoutes, { prefix: '/api/user' });
      
      const { reviewRoutes } = await import('./routes/review.routes');
      await fastify.register(reviewRoutes, { prefix: '/api' });
      
      await fastify.register(openAIRoutes, { prefix: '/api/ai' });
      
      const { invoiceSimpleRoutes } = await import('./routes/invoice-simple.routes');
      await fastify.register(invoiceSimpleRoutes, { prefix: '/api/invoices' });

      const { testCardRoutes } = await import('./routes/test-card.routes');
      await fastify.register(testCardRoutes, { prefix: '/api/test-cards' });

      const { paymentRoutes } = await import('./routes/payment.routes');
      await fastify.register(paymentRoutes, { prefix: '/api/payments' });

      const { userCardRoutes } = await import('./routes/user-card.routes');
      await fastify.register(userCardRoutes, { prefix: '/api/user-cards' });

      await fastify.register(chatRoutes, { prefix: '/api/chat' });

      const { uploadRoutes } = await import('./routes/upload.routes');
      await fastify.register(uploadRoutes, { prefix: '/api/upload' });

      const { mediaRoutes } = await import('./routes/media.routes');
      await fastify.register(mediaRoutes, { prefix: '/api' });

      const { productAdvancedRoutes } = await import('./routes/product-advanced.routes');
      await fastify.register(productAdvancedRoutes, { prefix: '/api' });

      const { currencyRoutes } = await import('./routes/currency.routes');
      await fastify.register(currencyRoutes, { prefix: '/api' });

      await fastify.register(inventoryRoutes, { prefix: '/api' });

      const { carouselRoutes } = await import('./routes/carousel.routes');
      await fastify.register(carouselRoutes, { prefix: '/api/carousel' });

      const { financialReportsRoutes } = await import('./routes/financial-reports.routes');
      await fastify.register(financialReportsRoutes, { prefix: '/api' });

      const { announcementBannerRoutes } = await import('./routes/announcement-banner.routes');
      await fastify.register(announcementBannerRoutes, { prefix: '/api' });

      const { giftRuleRoutes } = await import('./routes/gift-rule.routes');
      await fastify.register(giftRuleRoutes, { prefix: '/api/admin/gift-rules' });

      const { giftPublicRoutes } = await import('./routes/gift-public.routes');
      await fastify.register(giftPublicRoutes, { prefix: '/api/gift-rules' });

      const { translationRoutes } = await import('./routes/translation.routes');
      await fastify.register(translationRoutes, { prefix: '/api' });

      console.log('✅ Toate rutele au fost înregistrate cu succes');
    } catch (error) {
      console.error('❌ Eroare la înregistrarea rutelor:', error);
      throw error;
    }

    // 6. Global error handler
    fastify.setErrorHandler((error: Error, request, reply) => {
      fastify.log.error({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const statusCode = (error as any).statusCode || 500;
      
      reply.code(statusCode).send({
        error: error.name || 'Internal Server Error',
        message: env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
        ...(env.NODE_ENV !== 'production' && { stack: error.stack }),
      });
    });

    // 7. Start server
    console.log('🌐 Pornire server HTTP...');
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    console.log(`\n✅ Server pornit cu succes!`);
    console.log(`🚀 HTTP: http://localhost:${PORT}`);
    console.log(`💬 Socket.IO: ws://localhost:${PORT}`);
    console.log(`🌍 CORS: ${CORS_ORIGIN}`);
    console.log(`📊 Environment: ${env.NODE_ENV}\n`);
    
    // 8. Actualizează cursurile valutare la pornire (async, non-blocking)
    updateCurrenciesOnStartup().catch(err => {
      console.error('⚠️ Eroare la actualizarea cursurilor la pornire:', err);
    });
    
    // 9. Programează actualizarea zilnică a cursurilor
    scheduleCurrencyUpdate();
    
  } catch (err) {
    console.error('❌ Eroare fatală la pornirea serverului:', err);
    fastify.log.error(err);
    await disconnectDatabase();
    process.exit(1);
  }
}

start();
