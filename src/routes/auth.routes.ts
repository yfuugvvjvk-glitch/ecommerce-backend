import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service';
import { verificationService } from '../services/verification.service';
import { rateLimitService } from '../services/rate-limit.service';
import securityService, { VerificationType } from '../services/security.service';
import {
  RegisterSchema,
  LoginSchema,
  VerifyEmailSchema,
  ResendEmailCodeSchema,
} from '../schemas/auth.schema';
import bcrypt from 'bcrypt';

const authService = new AuthService();

export async function authRoutes(fastify: FastifyInstance) {
  // Register endpoint - creates user directly without email verification
  fastify.post('/register', async (request, reply) => {
    try {
      const body = RegisterSchema.parse(request.body);

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
      const hashedPassword = await bcrypt.hash(body.password, 10);

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
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        reply.code(400).send({
          success: false,
          error: error.message,
        });
      } else {
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
      const body = VerifyEmailSchema.parse(request.body);
      const ipAddress = request.ip;

      // Check if account is locked
      const isLocked = await securityService.isAccountLocked(body.email);
      if (isLocked) {
        reply.code(403).send({
          success: false,
          error:
            'Contul dvs. a fost blocat temporar din cauza prea multor încercări eșuate. Vă rugăm să așteptați 1 oră.',
        });
        return;
      }

      // Verify the code
      const result = await verificationService.verifyEmailCode(
        body.email,
        body.code
      );

      // Record verification attempt
      await securityService.recordVerificationAttempt(
        body.email,
        VerificationType.EMAIL_REGISTRATION,
        result.success,
        ipAddress
      );

      if (result.success && result.user) {
        // Generate JWT token for the new user
        const token = await authService.generateToken(result.user.id);

        reply.code(200).send({
          success: true,
          message: result.message,
          token,
          user: result.user,
        });
      } else {
        reply.code(400).send({
          success: false,
          error: result.message,
          remainingAttempts: result.remainingAttempts,
        });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      if (error instanceof Error) {
        reply.code(400).send({
          success: false,
          error: error.message,
        });
      } else {
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
      const body = ResendEmailCodeSchema.parse(request.body);

      // Check if account is locked
      const isLocked = await securityService.isAccountLocked(body.email);
      if (isLocked) {
        reply.code(403).send({
          success: false,
          error:
            'Contul dvs. a fost blocat temporar din cauza prea multor încercări eșuate. Vă rugăm să așteptați 1 oră.',
        });
        return;
      }

      // Check rate limit (5 codes per hour)
      const rateLimitResult = await rateLimitService.checkLimit(body.email);
      if (!rateLimitResult.allowed) {
        reply.code(429).send({
          success: false,
          error: `Ați depășit limita de solicitări. Vă rugăm să așteptați ${rateLimitResult.waitTimeMinutes} minute.`,
          waitTimeMinutes: rateLimitResult.waitTimeMinutes,
        });
        return;
      }

      // Resend verification code
      const result = await verificationService.resendEmailCode(body.email);

      // Record rate limit attempt
      if (result.success) {
        await rateLimitService.recordAttempt(body.email);
      }

      if (result.success) {
        reply.code(200).send({
          success: true,
          message: result.message,
        });
      } else {
        reply.code(400).send({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Resend email code error:', error);
      if (error instanceof Error) {
        reply.code(400).send({
          success: false,
          error: error.message,
        });
      } else {
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
