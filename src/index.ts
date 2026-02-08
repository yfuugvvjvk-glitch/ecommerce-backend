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
// Comentez noile routes care pot cauza probleme
// import { inventoryRoutes } from './routes/inventory.routes';


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
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://ecommerce-frontend-navy.vercel.app';

async function start() {
  try {
    // Register plugins
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Disable for file uploads
    });
    
    await fastify.register(cors, {
      origin: [CORS_ORIGIN, 'http://localhost:3000'], // Support both production and development
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

    // Register form-urlencoded support
    const formbody = await import('@fastify/formbody');
    await fastify.register(formbody.default);



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
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV
      };
    });

    // Keep-alive endpoint pentru a preveni sleep mode
    fastify.get('/ping', async () => {
      return { pong: true, timestamp: new Date().toISOString() };
    });

    // Register DOAR routes-urile originale care funcționau
    await fastify.register(publicRoutes, { prefix: '/api/public' });
    await fastify.register(dataRoutes, { prefix: '/api/data' });
    await fastify.register(cartRoutes, { prefix: '/api/cart' });
    await fastify.register(orderRoutes, { prefix: '/api/orders' });
    await fastify.register(voucherRoutes, { prefix: '/api/vouchers' });
    await fastify.register(offerRoutes, { prefix: '/api/offers' });
    await fastify.register(categoryRoutes, { prefix: '/api/categories' });
    await fastify.register(adminRoutes, { prefix: '/api/admin' });
    await fastify.register(userRoutes, { prefix: '/api/user' });
    
    // Register review routes
    const { reviewRoutes } = await import('./routes/review.routes');
    await fastify.register(reviewRoutes, { prefix: '/api' });
    
    // Register OpenAI routes
    await fastify.register(openAIRoutes, { prefix: '/api/ai' });
    
    // Register invoice routes
    const { invoiceSimpleRoutes } = await import('./routes/invoice-simple.routes');
    await fastify.register(invoiceSimpleRoutes, { prefix: '/api/invoices' });

    // Register test card routes
    const { testCardRoutes } = await import('./routes/test-card.routes');
    await fastify.register(testCardRoutes, { prefix: '/api/test-cards' });

    // Register payment routes
    const { paymentRoutes } = await import('./routes/payment.routes');
    await fastify.register(paymentRoutes, { prefix: '/api/payments' });

    // Register user card routes
    const { userCardRoutes } = await import('./routes/user-card.routes');
    await fastify.register(userCardRoutes, { prefix: '/api/user-cards' });

    // Register chat routes
    await fastify.register(chatRoutes, { prefix: '/api/chat' });

    // Register upload routes
    const { uploadRoutes } = await import('./routes/upload.routes');
    await fastify.register(uploadRoutes, { prefix: '/api/upload' });

    // Register media routes
    const { mediaRoutes } = await import('./routes/media.routes');
    await fastify.register(mediaRoutes, { prefix: '/api' });

    // Register advanced product routes
    const { productAdvancedRoutes } = await import('./routes/product-advanced.routes');
    await fastify.register(productAdvancedRoutes, { prefix: '/api' });

    // Register currency routes
    const { currencyRoutes } = await import('./routes/currency.routes');
    await fastify.register(currencyRoutes, { prefix: '/api' });

    // Add Socket.IO to fastify instance for use in routes BEFORE starting server
    const io = new SocketIOServer(fastify.server, {
      cors: {
        origin: [CORS_ORIGIN, 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    fastify.decorate('io', io);

    // Inițializează serviciul realtime
    initializeRealtimeService(fastify);

    // Global error handler
    fastify.setErrorHandler((error: Error, request, reply) => {
      fastify.log.error({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
      });

      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    });

    // Start server
    const server = await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    // Socket.IO authentication middleware
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
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.userEmail} (${socket.userId})`);

      // Join user to their personal room for notifications
      socket.join(`user_${socket.userId}`);

      // Join chat rooms
      socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        console.log(`👥 User ${socket.userEmail} joined room: ${roomId}`);
      });

      // Leave chat rooms
      socket.on('leave_room', (roomId: string) => {
        socket.leave(roomId);
        console.log(`👋 User ${socket.userEmail} left room: ${roomId}`);
      });

      // Handle typing indicators
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

      // Handle user status
      socket.on('user_online', () => {
        socket.broadcast.emit('user_status_change', {
          userId: socket.userId,
          status: 'online'
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.userEmail} (${socket.userId})`);
        socket.broadcast.emit('user_status_change', {
          userId: socket.userId,
          status: 'offline'
        });
      });
    });
    
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`💬 Socket.IO chat server ready`);
    
    // Actualizează cursurile valutare la pornire
    await updateCurrenciesOnStartup();
    
    // Programează actualizarea zilnică a cursurilor
    scheduleCurrencyUpdate();
    
    // Schedule cleanup jobs - Removed for simplicity
    // scheduleCleanupJobs();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();