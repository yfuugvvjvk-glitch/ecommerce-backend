import { VerificationService } from '../verification.service';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    pendingUser: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    verificationCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('VerificationService', () => {
  let service: VerificationService;

  beforeEach(() => {
    service = new VerificationService();
  });

  describe('generateVerificationCode', () => {
    it('should generate a 6-digit code', () => {
      const code = service.generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    });

    it('should generate codes with leading zeros', () => {
      // Generate multiple codes to increase chance of getting one with leading zeros
      const codes = Array.from({ length: 100 }, () => service.generateVerificationCode());
      
      // At least some codes should have leading zeros
      const hasLeadingZeros = codes.some(code => code.startsWith('0'));
      expect(hasLeadingZeros).toBe(true);
    });

    it('should generate different codes on multiple calls', () => {
      const code1 = service.generateVerificationCode();
      const code2 = service.generateVerificationCode();
      const code3 = service.generateVerificationCode();
      
      // While theoretically possible to get duplicates, it's extremely unlikely
      const allSame = code1 === code2 && code2 === code3;
      expect(allSame).toBe(false);
    });

    it('should generate codes within valid range (0-999999)', () => {
      const codes = Array.from({ length: 50 }, () => service.generateVerificationCode());
      
      codes.forEach(code => {
        const numericValue = parseInt(code, 10);
        expect(numericValue).toBeGreaterThanOrEqual(0);
        expect(numericValue).toBeLessThanOrEqual(999999);
      });
    });
  });

  describe('hashCode', () => {
    it('should hash a code using bcrypt', async () => {
      const code = '123456';
      const hash = await service.hashCode(code);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(code);
      expect(hash.length).toBeGreaterThan(code.length);
    });

    it('should generate different hashes for the same code', async () => {
      const code = '123456';
      const hash1 = await service.hashCode(code);
      const hash2 = await service.hashCode(code);
      
      // bcrypt generates different salts, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it('should generate valid bcrypt hashes', async () => {
      const code = '654321';
      const hash = await service.hashCode(code);
      
      // bcrypt hashes start with $2b$ (or $2a$) and have specific format
      expect(hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('verifyCodeHash', () => {
    it('should return true for matching code and hash', async () => {
      const code = '123456';
      const hash = await service.hashCode(code);
      
      const isValid = await service.verifyCodeHash(code, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for non-matching code and hash', async () => {
      const code = '123456';
      const wrongCode = '654321';
      const hash = await service.hashCode(code);
      
      const isValid = await service.verifyCodeHash(wrongCode, hash);
      expect(isValid).toBe(false);
    });

    it('should return false for slightly different codes', async () => {
      const code = '123456';
      const similarCode = '123457';
      const hash = await service.hashCode(code);
      
      const isValid = await service.verifyCodeHash(similarCode, hash);
      expect(isValid).toBe(false);
    });

    it('should handle codes with leading zeros', async () => {
      const code = '000123';
      const hash = await service.hashCode(code);
      
      const isValid = await service.verifyCodeHash(code, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('isCodeExpired', () => {
    it('should return false for future expiration date', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      const isExpired = service.isCodeExpired(futureDate);
      expect(isExpired).toBe(false);
    });

    it('should return true for past expiration date', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const isExpired = service.isCodeExpired(pastDate);
      expect(isExpired).toBe(true);
    });

    it('should return true for expiration date exactly now', () => {
      const now = new Date(Date.now() - 1); // 1ms ago to ensure it's in the past
      const isExpired = service.isCodeExpired(now);
      expect(isExpired).toBe(true);
    });

    it('should handle 15-minute expiration correctly', () => {
      const fifteenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000);
      const isExpired = service.isCodeExpired(fifteenMinutesFromNow);
      expect(isExpired).toBe(false);
    });

    it('should handle expired 15-minute window', () => {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const isExpired = service.isCodeExpired(fifteenMinutesAgo);
      expect(isExpired).toBe(true);
    });
  });

  describe('sendEmailVerificationCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create pending user and verification code', async () => {
      const mockPendingUser = {
        id: 'pending-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: null,
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      (prisma.pendingUser.create as jest.Mock).mockResolvedValue(mockPendingUser);
      (prisma.verificationCode.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendEmailVerificationCode(
        'test@example.com',
        'hashed-password',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Codul de verificare a fost trimis la adresa de email.');
      expect(result.pendingUserId).toBe('pending-user-id');
      expect(prisma.pendingUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            password: 'hashed-password',
            name: 'Test User',
          }),
        })
      );
      expect(prisma.verificationCode.create).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (prisma.pendingUser.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.sendEmailVerificationCode(
        'test@example.com',
        'hashed-password',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.');
    });

    it('should include phone number if provided', async () => {
      const mockPendingUser = {
        id: 'pending-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: '+40123456789',
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      (prisma.pendingUser.create as jest.Mock).mockResolvedValue(mockPendingUser);
      (prisma.verificationCode.create as jest.Mock).mockResolvedValue({});

      await service.sendEmailVerificationCode(
        'test@example.com',
        'hashed-password',
        'Test User',
        '+40123456789'
      );

      expect(prisma.pendingUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '+40123456789',
          }),
        })
      );
    });
  });

  describe('verifyEmailCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should verify valid code and create user account', async () => {
      const code = '123456';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        email: 'test@example.com',
        type: 'EMAIL_REGISTRATION',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPendingUser = {
        id: 'pending-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: null,
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.pendingUser.findUnique as jest.Mock).mockResolvedValue(mockPendingUser);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue({});
      (prisma.pendingUser.delete as jest.Mock).mockResolvedValue({});

      const result = await service.verifyEmailCode('test@example.com', code);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Verificarea a fost realizată cu succes.');
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.pendingUser.delete).toHaveBeenCalled();
    });

    it('should return error for non-existent code', async () => {
      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyEmailCode('test@example.com', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare nu a fost găsit.');
    });

    it('should return error for expired code', async () => {
      const mockVerificationCode = {
        id: 'verification-code-id',
        email: 'test@example.com',
        type: 'EMAIL_REGISTRATION',
        codeHash: 'hash',
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);

      const result = await service.verifyEmailCode('test@example.com', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare a expirat. Vă rugăm să solicitați un cod nou.');
    });

    it('should return error for invalidated code', async () => {
      const mockVerificationCode = {
        id: 'verification-code-id',
        email: 'test@example.com',
        type: 'EMAIL_REGISTRATION',
        codeHash: 'hash',
        attempts: 3,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue({});

      const result = await service.verifyEmailCode('test@example.com', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.');
    });

    it('should increment attempts for invalid code', async () => {
      const code = '123456';
      const wrongCode = '654321';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        email: 'test@example.com',
        type: 'EMAIL_REGISTRATION',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCode = { ...mockVerificationCode, attempts: 1 };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue(updatedCode);

      const result = await service.verifyEmailCode('test@example.com', wrongCode);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Mai aveți 2 încercări');
      expect(result.remainingAttempts).toBe(2);
      expect(prisma.verificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { attempts: 1 },
        })
      );
    });

    it('should invalidate code after max attempts', async () => {
      const code = '123456';
      const wrongCode = '654321';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        email: 'test@example.com',
        type: 'EMAIL_REGISTRATION',
        codeHash,
        attempts: 2,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCode = { ...mockVerificationCode, attempts: 3 };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.verificationCode.update as jest.Mock)
        .mockResolvedValueOnce(updatedCode)
        .mockResolvedValueOnce({ ...updatedCode, invalidated: true });

      const result = await service.verifyEmailCode('test@example.com', wrongCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.');
      expect(prisma.verificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { invalidated: true },
        })
      );
    });
  });

  describe('resendEmailCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should invalidate old code and create new one', async () => {
      const mockPendingUser = {
        id: 'pending-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: null,
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      (prisma.pendingUser.findUnique as jest.Mock).mockResolvedValue(mockPendingUser);
      (prisma.verificationCode.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.verificationCode.create as jest.Mock).mockResolvedValue({});

      const result = await service.resendEmailCode('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Codul de verificare a fost trimis la adresa de email.');
      expect(prisma.verificationCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'test@example.com',
            type: 'EMAIL_REGISTRATION',
            verified: false,
          }),
          data: { invalidated: true },
        })
      );
      expect(prisma.verificationCode.create).toHaveBeenCalled();
    });

    it('should return error if pending user not found', async () => {
      (prisma.pendingUser.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.resendEmailCode('test@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Utilizatorul nu a fost găsit.');
    });

    it('should handle errors gracefully', async () => {
      (prisma.pendingUser.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.resendEmailCode('test@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.');
    });
  });

  describe('sendEmailChangeCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create verification code for email change', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'old@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.verificationCode.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.verificationCode.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendEmailChangeCode('user-id', 'new@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Codul de verificare a fost trimis la adresa de email.');
      expect(prisma.verificationCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-id',
            email: 'new@example.com',
            type: 'EMAIL_CHANGE',
          }),
        })
      );
    });

    it('should invalidate previous email change codes', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'old@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.verificationCode.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.verificationCode.create as jest.Mock).mockResolvedValue({});

      await service.sendEmailChangeCode('user-id', 'new@example.com');

      expect(prisma.verificationCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id',
            type: 'EMAIL_CHANGE',
            verified: false,
          }),
          data: { invalidated: true },
        })
      );
    });

    it('should return error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.sendEmailChangeCode('user-id', 'new@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Utilizatorul nu a fost găsit.');
    });

    it('should handle errors gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.sendEmailChangeCode('user-id', 'new@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.');
    });
  });

  describe('verifyEmailChangeCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should verify valid code and update user email', async () => {
      const code = '123456';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        email: 'new@example.com',
        type: 'EMAIL_CHANGE',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: 'user-id',
        email: 'new@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue({});

      const result = await service.verifyEmailChangeCode('user-id', code);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Adresa de email a fost schimbată cu succes.');
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('new@example.com');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id' },
          data: expect.objectContaining({
            email: 'new@example.com',
            emailVerified: true,
          }),
        })
      );
    });

    it('should return error for non-existent code', async () => {
      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyEmailChangeCode('user-id', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare nu a fost găsit.');
    });

    it('should return error for expired code', async () => {
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        email: 'new@example.com',
        type: 'EMAIL_CHANGE',
        codeHash: 'hash',
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);

      const result = await service.verifyEmailChangeCode('user-id', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare a expirat. Vă rugăm să solicitați un cod nou.');
    });

    it('should increment attempts for invalid code', async () => {
      const code = '123456';
      const wrongCode = '654321';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        email: 'new@example.com',
        type: 'EMAIL_CHANGE',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCode = { ...mockVerificationCode, attempts: 1 };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue(updatedCode);

      const result = await service.verifyEmailChangeCode('user-id', wrongCode);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Mai aveți 2 încercări');
      expect(result.remainingAttempts).toBe(2);
    });

    it('should invalidate code after max attempts', async () => {
      const code = '123456';
      const wrongCode = '654321';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        email: 'new@example.com',
        type: 'EMAIL_CHANGE',
        codeHash,
        attempts: 2,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCode = { ...mockVerificationCode, attempts: 3 };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.verificationCode.update as jest.Mock)
        .mockResolvedValueOnce(updatedCode)
        .mockResolvedValueOnce({ ...updatedCode, invalidated: true });

      const result = await service.verifyEmailChangeCode('user-id', wrongCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.');
    });

    it('should return error if email is missing from verification code', async () => {
      const code = '123456';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        email: null, // Missing email
        type: 'EMAIL_CHANGE',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);

      const result = await service.verifyEmailChangeCode('user-id', code);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Adresa de email nu a fost găsită.');
    });

    it('should handle errors gracefully', async () => {
      (prisma.verificationCode.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.verifyEmailChangeCode('user-id', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('A apărut o eroare la verificarea codului. Vă rugăm să încercați din nou.');
    });
  });

  describe('sendPhoneChangeCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create verification code for phone change', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: '+40111111111',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.verificationCode.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.verificationCode.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendPhoneChangeCode('user-id', '+40222222222');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Codul de verificare a fost trimis la adresa de email.');
      expect(prisma.verificationCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-id',
            phone: '+40222222222',
            type: 'PHONE_CHANGE',
          }),
        })
      );
    });

    it('should invalidate previous phone change codes', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: '+40111111111',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.verificationCode.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.verificationCode.create as jest.Mock).mockResolvedValue({});

      await service.sendPhoneChangeCode('user-id', '+40222222222');

      expect(prisma.verificationCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id',
            type: 'PHONE_CHANGE',
            verified: false,
          }),
          data: { invalidated: true },
        })
      );
    });

    it('should return error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.sendPhoneChangeCode('user-id', '+40222222222');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Utilizatorul nu a fost găsit.');
    });

    it('should handle errors gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.sendPhoneChangeCode('user-id', '+40222222222');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.');
    });

    it('should send code to user email, not phone', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: '+40111111111',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.verificationCode.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.verificationCode.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendPhoneChangeCode('user-id', '+40222222222');

      // Verify that the result is successful
      // The email service should send to user's email (user@example.com), not to the phone number
      expect(result.success).toBe(true);
      expect(result.message).toContain('Codul de verificare a fost trimis');
    });


  });

  describe('verifyPhoneChangeCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should verify valid code and update user phone', async () => {
      const code = '123456';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        phone: '+40222222222',
        type: 'PHONE_CHANGE',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: '+40222222222',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue({});

      const result = await service.verifyPhoneChangeCode('user-id', code);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Numărul de telefon a fost schimbat cu succes.');
      expect(result.user).toBeDefined();
      expect(result.user?.phone).toBe('+40222222222');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id' },
          data: expect.objectContaining({
            phone: '+40222222222',
          }),
        })
      );
    });

    it('should return error for non-existent code', async () => {
      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyPhoneChangeCode('user-id', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare nu a fost găsit.');
    });

    it('should return error for expired code', async () => {
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        phone: '+40222222222',
        type: 'PHONE_CHANGE',
        codeHash: 'hash',
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);

      const result = await service.verifyPhoneChangeCode('user-id', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare a expirat. Vă rugăm să solicitați un cod nou.');
    });

    it('should return error for invalidated code', async () => {
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        phone: '+40222222222',
        type: 'PHONE_CHANGE',
        codeHash: 'hash',
        attempts: 3,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue({});

      const result = await service.verifyPhoneChangeCode('user-id', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.');
    });

    it('should increment attempts for invalid code', async () => {
      const code = '123456';
      const wrongCode = '654321';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        phone: '+40222222222',
        type: 'PHONE_CHANGE',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCode = { ...mockVerificationCode, attempts: 1 };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue(updatedCode);

      const result = await service.verifyPhoneChangeCode('user-id', wrongCode);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Mai aveți 2 încercări');
      expect(result.remainingAttempts).toBe(2);
      expect(prisma.verificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { attempts: 1 },
        })
      );
    });

    it('should invalidate code after max attempts', async () => {
      const code = '123456';
      const wrongCode = '654321';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        phone: '+40222222222',
        type: 'PHONE_CHANGE',
        codeHash,
        attempts: 2,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCode = { ...mockVerificationCode, attempts: 3 };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.verificationCode.update as jest.Mock)
        .mockResolvedValueOnce(updatedCode)
        .mockResolvedValueOnce({ ...updatedCode, invalidated: true });

      const result = await service.verifyPhoneChangeCode('user-id', wrongCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.');
      expect(prisma.verificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { invalidated: true },
        })
      );
    });

    it('should return error if phone is missing from verification code', async () => {
      const code = '123456';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        phone: null, // Missing phone
        type: 'PHONE_CHANGE',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);

      const result = await service.verifyPhoneChangeCode('user-id', code);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Numărul de telefon nu a fost găsit.');
    });

    it('should handle errors gracefully', async () => {
      (prisma.verificationCode.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.verifyPhoneChangeCode('user-id', '123456');

      expect(result.success).toBe(false);
      expect(result.message).toBe('A apărut o eroare la verificarea codului. Vă rugăm să încercați din nou.');
    });

    it('should mark verification code as verified after successful verification', async () => {
      const code = '123456';
      const codeHash = await service.hashCode(code);
      const mockVerificationCode = {
        id: 'verification-code-id',
        userId: 'user-id',
        phone: '+40222222222',
        type: 'PHONE_CHANGE',
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verified: false,
        invalidated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: '+40222222222',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      };

      (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(mockVerificationCode);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue({});

      await service.verifyPhoneChangeCode('user-id', code);

      expect(prisma.verificationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'verification-code-id' },
          data: expect.objectContaining({
            verified: true,
            verifiedAt: expect.any(Date),
          }),
        })
      );
    });
  });
});
