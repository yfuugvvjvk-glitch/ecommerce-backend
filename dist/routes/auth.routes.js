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
exports.authRoutes = authRoutes;
const auth_service_1 = require("../services/auth.service");
const verification_service_1 = require("../services/verification.service");
const rate_limit_service_1 = require("../services/rate-limit.service");
const security_service_1 = __importStar(require("../services/security.service"));
const auth_schema_1 = require("../schemas/auth.schema");
const bcrypt_1 = __importDefault(require("bcrypt"));
const authService = new auth_service_1.AuthService();
async function authRoutes(fastify) {
    // Register endpoint - creates user directly without email verification
    fastify.post('/register', async (request, reply) => {
        try {
            const body = auth_schema_1.RegisterSchema.parse(request.body);
            // Check if user already exists
            const existingUser = await authService.findUserByEmail(body.email);
            if (existingUser) {
                reply.code(409).send({
                    success: false,
                    error: 'Un utilizator cu această adresă de email există deja.',
                });
                return;
            }
            // Hash password
            const hashedPassword = await bcrypt_1.default.hash(body.password, 10);
            // Create user directly
            const user = await authService.createUser({
                email: body.email,
                password: hashedPassword,
                name: body.name,
                phone: body.phone,
                emailVerified: true, // Auto-verify since we're skipping email verification
            });
            // Generate JWT token
            const token = await authService.generateToken(user.id);
            reply.code(201).send({
                success: true,
                message: 'Contul a fost creat cu succes!',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                },
            });
        }
        catch (error) {
            console.error('Registration error:', error);
            if (error instanceof Error) {
                reply.code(400).send({
                    success: false,
                    error: error.message,
                });
            }
            else {
                reply.code(500).send({
                    success: false,
                    error: 'A apărut o eroare internă.',
                });
            }
        }
    });
    // Verify email endpoint - validates code and creates user account
    fastify.post('/verify-email', async (request, reply) => {
        try {
            const body = auth_schema_1.VerifyEmailSchema.parse(request.body);
            const ipAddress = request.ip;
            // Check if account is locked
            const isLocked = await security_service_1.default.isAccountLocked(body.email);
            if (isLocked) {
                reply.code(403).send({
                    success: false,
                    error: 'Contul dvs. a fost blocat temporar din cauza prea multor încercări eșuate. Vă rugăm să așteptați 1 oră.',
                });
                return;
            }
            // Verify the code
            const result = await verification_service_1.verificationService.verifyEmailCode(body.email, body.code);
            // Record verification attempt
            await security_service_1.default.recordVerificationAttempt(body.email, security_service_1.VerificationType.EMAIL_REGISTRATION, result.success, ipAddress);
            if (result.success && result.user) {
                // Generate JWT token for the new user
                const token = await authService.generateToken(result.user.id);
                reply.code(200).send({
                    success: true,
                    message: result.message,
                    token,
                    user: result.user,
                });
            }
            else {
                reply.code(400).send({
                    success: false,
                    error: result.message,
                    remainingAttempts: result.remainingAttempts,
                });
            }
        }
        catch (error) {
            console.error('Email verification error:', error);
            if (error instanceof Error) {
                reply.code(400).send({
                    success: false,
                    error: error.message,
                });
            }
            else {
                reply.code(500).send({
                    success: false,
                    error: 'A apărut o eroare internă.',
                });
            }
        }
    });
    // Resend email verification code endpoint
    fastify.post('/resend-email-code', async (request, reply) => {
        try {
            const body = auth_schema_1.ResendEmailCodeSchema.parse(request.body);
            // Check if account is locked
            const isLocked = await security_service_1.default.isAccountLocked(body.email);
            if (isLocked) {
                reply.code(403).send({
                    success: false,
                    error: 'Contul dvs. a fost blocat temporar din cauza prea multor încercări eșuate. Vă rugăm să așteptați 1 oră.',
                });
                return;
            }
            // Check rate limit (5 codes per hour)
            const rateLimitResult = await rate_limit_service_1.rateLimitService.checkLimit(body.email);
            if (!rateLimitResult.allowed) {
                reply.code(429).send({
                    success: false,
                    error: `Ați depășit limita de solicitări. Vă rugăm să așteptați ${rateLimitResult.waitTimeMinutes} minute.`,
                    waitTimeMinutes: rateLimitResult.waitTimeMinutes,
                });
                return;
            }
            // Resend verification code
            const result = await verification_service_1.verificationService.resendEmailCode(body.email);
            // Record rate limit attempt
            if (result.success) {
                await rate_limit_service_1.rateLimitService.recordAttempt(body.email);
            }
            if (result.success) {
                reply.code(200).send({
                    success: true,
                    message: result.message,
                });
            }
            else {
                reply.code(400).send({
                    success: false,
                    error: result.message,
                });
            }
        }
        catch (error) {
            console.error('Resend email code error:', error);
            if (error instanceof Error) {
                reply.code(400).send({
                    success: false,
                    error: error.message,
                });
            }
            else {
                reply.code(500).send({
                    success: false,
                    error: 'A apărut o eroare internă.',
                });
            }
        }
    });
    // Login endpoint
    fastify.post('/login', async (request, reply) => {
        try {
            const body = auth_schema_1.LoginSchema.parse(request.body);
            const result = await authService.login(body.email, body.password);
            reply.send({
                token: result.token,
                user: result.user,
            });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('Invalid')) {
                    reply.code(401).send({ error: error.message });
                }
                else {
                    reply.code(400).send({ error: error.message });
                }
            }
            else {
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
        }
        catch (error) {
            if (error instanceof Error) {
                reply.code(401).send({ error: error.message });
            }
            else {
                reply.code(500).send({ error: 'Internal server error' });
            }
        }
    });
}
