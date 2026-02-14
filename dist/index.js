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
const env_validator_1 = require("./utils/env-validator");
const prisma_1 = require("./utils/prisma");
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
const currency_update_job_1 = require("./jobs/currency-update.job");
const inventory_routes_1 = require("./routes/inventory.routes");
// Validează variabilele de mediu la pornire
const env = (0, env_validator_1.validateEnv)();
const fastify = (0, fastify_1.default)({
    logger: {
        level: env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: env.NODE_ENV !== 'production'
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
async function gracefulShutdown(signal) {
    console.log(`\n🛑 ${signal} primit, închid serverul...`);
    try {
        await fastify.close();
        await (0, prisma_1.disconnectDatabase)();
        console.log('✅ Server închis cu succes');
        process.exit(0);
    }
    catch (error) {
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
        const dbConnected = await (0, prisma_1.verifyDatabaseConnection)();
        if (!dbConnected) {
            throw new Error('Nu se poate conecta la baza de date');
        }
        // 2. Register plugins
        console.log('🔌 Înregistrare plugin-uri...');
        await fastify.register(helmet_1.default, {
            contentSecurityPolicy: false,
            crossOriginResourcePolicy: { policy: 'cross-origin' },
        });
        await fastify.register(cors_1.default, {
            origin: [CORS_ORIGIN, 'http://localhost:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        });
        await fastify.register(multipart_1.default, {
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        });
        const formbody = await Promise.resolve().then(() => __importStar(require('@fastify/formbody')));
        await fastify.register(formbody.default);
        await fastify.register(static_1.default, {
            root: path_1.default.join(process.cwd(), 'public'),
            prefix: '/',
            decorateReply: false,
            setHeaders: (res) => {
                res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            },
        });
        await fastify.register(jwt_1.default, {
            secret: env.JWT_SECRET,
        });
        await fastify.register(rate_limit_1.default, {
            max: 500,
            timeWindow: '1 minute',
        });
        // 3. Initialize Socket.IO BEFORE routes
        console.log('💬 Inițializare Socket.IO...');
        const io = new socket_io_1.Server(fastify.server, {
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
        io.on('connection', (socket) => {
            console.log(`🔌 User connected: ${socket.userEmail} (${socket.userId})`);
            socket.join(`user_${socket.userId}`);
            socket.on('join_room', (roomId) => {
                socket.join(roomId);
                console.log(`👥 User ${socket.userEmail} joined room: ${roomId}`);
            });
            socket.on('leave_room', (roomId) => {
                socket.leave(roomId);
                console.log(`👋 User ${socket.userEmail} left room: ${roomId}`);
            });
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
        (0, realtime_service_1.initializeRealtimeService)(fastify);
        // 4. Health check endpoints
        fastify.get('/health', async () => {
            const dbHealthy = await (0, prisma_1.verifyDatabaseConnection)();
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
            await fastify.register(async (instance) => {
                instance.register(rate_limit_1.default, {
                    max: 10,
                    timeWindow: '1 minute',
                });
                instance.register(auth_routes_1.authRoutes, { prefix: '/api/auth' });
            });
            await fastify.register(public_routes_1.publicRoutes, { prefix: '/api/public' });
            await fastify.register(data_routes_1.dataRoutes, { prefix: '/api/data' });
            await fastify.register(cart_routes_1.cartRoutes, { prefix: '/api/cart' });
            await fastify.register(order_routes_1.orderRoutes, { prefix: '/api/orders' });
            await fastify.register(voucher_routes_1.voucherRoutes, { prefix: '/api/vouchers' });
            await fastify.register(offer_routes_1.offerRoutes, { prefix: '/api/offers' });
            await fastify.register(category_routes_1.categoryRoutes, { prefix: '/api/categories' });
            await fastify.register(admin_routes_1.adminRoutes, { prefix: '/api/admin' });
            await fastify.register(user_routes_1.userRoutes, { prefix: '/api/user' });
            const { reviewRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/review.routes')));
            await fastify.register(reviewRoutes, { prefix: '/api' });
            await fastify.register(openai_routes_1.openAIRoutes, { prefix: '/api/ai' });
            const { invoiceSimpleRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/invoice-simple.routes')));
            await fastify.register(invoiceSimpleRoutes, { prefix: '/api/invoices' });
            const { testCardRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/test-card.routes')));
            await fastify.register(testCardRoutes, { prefix: '/api/test-cards' });
            const { paymentRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/payment.routes')));
            await fastify.register(paymentRoutes, { prefix: '/api/payments' });
            const { userCardRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/user-card.routes')));
            await fastify.register(userCardRoutes, { prefix: '/api/user-cards' });
            await fastify.register(chat_routes_1.chatRoutes, { prefix: '/api/chat' });
            const { uploadRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/upload.routes')));
            await fastify.register(uploadRoutes, { prefix: '/api/upload' });
            const { mediaRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/media.routes')));
            await fastify.register(mediaRoutes, { prefix: '/api' });
            const { productAdvancedRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/product-advanced.routes')));
            await fastify.register(productAdvancedRoutes, { prefix: '/api' });
            const { currencyRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/currency.routes')));
            await fastify.register(currencyRoutes, { prefix: '/api' });
            await fastify.register(inventory_routes_1.inventoryRoutes, { prefix: '/api' });
            const { carouselRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/carousel.routes')));
            await fastify.register(carouselRoutes, { prefix: '/api/carousel' });
            const { financialReportsRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/financial-reports.routes')));
            await fastify.register(financialReportsRoutes, { prefix: '/api' });
            const { announcementBannerRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/announcement-banner.routes')));
            await fastify.register(announcementBannerRoutes, { prefix: '/api' });
            const { giftRuleRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/gift-rule.routes')));
            await fastify.register(giftRuleRoutes, { prefix: '/api/admin/gift-rules' });
            const { giftPublicRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/gift-public.routes')));
            await fastify.register(giftPublicRoutes, { prefix: '/api/gift-rules' });
            console.log('✅ Toate rutele au fost înregistrate cu succes');
        }
        catch (error) {
            console.error('❌ Eroare la înregistrarea rutelor:', error);
            throw error;
        }
        // 6. Global error handler
        fastify.setErrorHandler((error, request, reply) => {
            fastify.log.error({
                error: error.message,
                stack: error.stack,
                url: request.url,
                method: request.method,
                headers: request.headers,
                body: request.body,
            });
            const statusCode = error.statusCode || 500;
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
        (0, currency_update_job_1.updateCurrenciesOnStartup)().catch(err => {
            console.error('⚠️ Eroare la actualizarea cursurilor la pornire:', err);
        });
        // 9. Programează actualizarea zilnică a cursurilor
        (0, currency_update_job_1.scheduleCurrencyUpdate)();
    }
    catch (err) {
        console.error('❌ Eroare fatală la pornirea serverului:', err);
        fastify.log.error(err);
        await (0, prisma_1.disconnectDatabase)();
        process.exit(1);
    }
}
start();
