"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const static_1 = __importDefault(require("@fastify/static"));
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const auth_routes_1 = require("./routes/auth.routes");
const data_routes_1 = require("./routes/data.routes");
const cart_routes_1 = require("./routes/cart.routes");
const order_routes_1 = require("./routes/order.routes");
const voucher_routes_1 = require("./routes/voucher.routes");
const admin_routes_1 = require("./routes/admin.routes");
const user_routes_1 = require("./routes/user.routes");
const openai_routes_1 = require("./routes/openai.routes");
const offer_routes_1 = require("./routes/offer.routes");
const category_routes_1 = require("./routes/category.routes");
const chat_routes_1 = require("./routes/chat.routes");
const public_routes_1 = require("./routes/public.routes");
const realtime_service_1 = require("./services/realtime.service");
// Comentez noile routes care pot cauza probleme
// import { inventoryRoutes } from './routes/inventory.routes';
const fastify = (0, fastify_1.default)({
    logger: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
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
        await fastify.register(helmet_1.default, {
            contentSecurityPolicy: false, // Disable for file uploads
        });
        await fastify.register(cors_1.default, {
            origin: [CORS_ORIGIN, 'http://localhost:3000'], // Support both production and development
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        });
        // Register multipart for file uploads
        await fastify.register(multipart_1.default, {
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        });
        // Register form-urlencoded support
        const formbody = await Promise.resolve().then(() => __importStar(require('@fastify/formbody')));
        await fastify.register(formbody.default);
        // Register static file serving
        await fastify.register(static_1.default, {
            root: path_1.default.join(process.cwd(), 'public'),
            prefix: '/',
            decorateReply: false,
            setHeaders: (res) => {
                res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            },
        });
        // Register JWT
        await fastify.register(jwt_1.default, {
            secret: process.env.JWT_SECRET || 'your-secret-key',
        });
        await fastify.register(rate_limit_1.default, {
            max: 100,
            timeWindow: '1 minute',
        });
        // Stricter rate limiting for auth endpoints
        await fastify.register(async (instance) => {
            instance.register(rate_limit_1.default, {
                max: 5,
                timeWindow: '1 minute',
            });
            instance.register(auth_routes_1.authRoutes, { prefix: '/api/auth' });
        });
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
        await fastify.register(public_routes_1.publicRoutes, { prefix: '/api/public' });
        await fastify.register(data_routes_1.dataRoutes, { prefix: '/api/data' });
        await fastify.register(cart_routes_1.cartRoutes, { prefix: '/api/cart' });
        await fastify.register(order_routes_1.orderRoutes, { prefix: '/api/orders' });
        await fastify.register(voucher_routes_1.voucherRoutes, { prefix: '/api/vouchers' });
        await fastify.register(offer_routes_1.offerRoutes, { prefix: '/api/offers' });
        await fastify.register(category_routes_1.categoryRoutes, { prefix: '/api/categories' });
        await fastify.register(admin_routes_1.adminRoutes, { prefix: '/api/admin' });
        await fastify.register(user_routes_1.userRoutes, { prefix: '/api/user' });
        // Register review routes
        const { reviewRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/review.routes')));
        await fastify.register(reviewRoutes, { prefix: '/api' });
        // Register OpenAI routes
        await fastify.register(openai_routes_1.openAIRoutes, { prefix: '/api/ai' });
        // Register invoice routes
        const { invoiceSimpleRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/invoice-simple.routes')));
        await fastify.register(invoiceSimpleRoutes, { prefix: '/api/invoices' });
        // Register test card routes
        const { testCardRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/test-card.routes')));
        await fastify.register(testCardRoutes, { prefix: '/api/test-cards' });
        // Register payment routes
        const { paymentRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/payment.routes')));
        await fastify.register(paymentRoutes, { prefix: '/api/payments' });
        // Register user card routes
        const { userCardRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/user-card.routes')));
        await fastify.register(userCardRoutes, { prefix: '/api/user-cards' });
        // Register chat routes
        await fastify.register(chat_routes_1.chatRoutes, { prefix: '/api/chat' });
        // Register upload routes
        const { uploadRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/upload.routes')));
        await fastify.register(uploadRoutes, { prefix: '/api/upload' });
        // Register media routes
        const { mediaRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/media.routes')));
        await fastify.register(mediaRoutes, { prefix: '/api' });
        // Register advanced product routes
        const { productAdvancedRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/product-advanced.routes')));
        await fastify.register(productAdvancedRoutes, { prefix: '/api' });
        // Add Socket.IO to fastify instance for use in routes BEFORE starting server
        const io = new socket_io_1.Server(fastify.server, {
            cors: {
                origin: [CORS_ORIGIN, 'http://localhost:3000'],
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        fastify.decorate('io', io);
        // Inițializează serviciul realtime
        (0, realtime_service_1.initializeRealtimeService)(fastify);
        // Global error handler
        fastify.setErrorHandler((error, request, reply) => {
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
                const decoded = fastify.jwt.verify(token);
                socket.userId = decoded.userId;
                socket.userEmail = decoded.email;
                socket.userRole = decoded.role;
                next();
            }
            catch (error) {
                next(new Error('Authentication error'));
            }
        });
        // Socket.IO connection handling
        io.on('connection', (socket) => {
            console.log(`🔌 User connected: ${socket.userEmail} (${socket.userId})`);
            // Join user to their personal room for notifications
            socket.join(`user_${socket.userId}`);
            // Join chat rooms
            socket.on('join_room', (roomId) => {
                socket.join(roomId);
                console.log(`👥 User ${socket.userEmail} joined room: ${roomId}`);
            });
            // Leave chat rooms
            socket.on('leave_room', (roomId) => {
                socket.leave(roomId);
                console.log(`👋 User ${socket.userEmail} left room: ${roomId}`);
            });
            // Handle typing indicators
            socket.on('typing_start', (data) => {
                socket.to(data.roomId).emit('user_typing', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    roomId: data.roomId
                });
            });
            socket.on('typing_stop', (data) => {
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
        // Schedule cleanup jobs - Removed for simplicity
        // scheduleCleanupJobs();
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
start();
