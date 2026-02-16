import { VerificationService } from '../verification.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    verificationCode: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('VerificationService - Database Query Methods', () => {
  let service: VerificationService;

  beforeEach(() => {
    service = new VerificationService();
    jest.clearAllMocks();
  });

  describe('getCodesByIdentifierAndType', () => {
    it('should query codes by email and type', async () => {
      const mockCodes = [
        {
          id: 'code-1',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: new Date(),
          verified: false,
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'code-2',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash2',
          attempts: 1,
          maxAttempts: 3,
          expiresAt: new Date(),
          verified: false,
          invalidated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getCodesByIdentifierAndType('test@example.com', 'EMAIL_REGISTRATION');

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('test@example.com');
      expect(result[0].type).toBe('EMAIL_REGISTRATION');
      expect(prisma.verificationCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'test@example.com',
            type: 'EMAIL_REGISTRATION',
          }),
        })
      );
    });

    it('should query codes by userId and type', async () => {
      const mockCodes = [
        {
          id: 'code-1',
          email: 'new@example.com',
          userId: 'user-123',
          type: 'EMAIL_CHANGE',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: new Date(),
          verified: true,
          verifiedAt: new Date(),
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getCodesByIdentifierAndType('user-123', 'EMAIL_CHANGE');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
      expect(result[0].type).toBe('EMAIL_CHANGE');
      expect(prisma.verificationCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            type: 'EMAIL_CHANGE',
          }),
        })
      );
    });

    it('should return empty array if no codes found', async () => {
      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCodesByIdentifierAndType('test@example.com', 'EMAIL_REGISTRATION');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.verificationCode.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.getCodesByIdentifierAndType('test@example.com', 'EMAIL_REGISTRATION');

      expect(result).toHaveLength(0);
    });

    it('should include expired codes for audit purposes', async () => {
      const expiredDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const mockCodes = [
        {
          id: 'code-1',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: expiredDate,
          verified: false,
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getCodesByIdentifierAndType('test@example.com', 'EMAIL_REGISTRATION');

      expect(result).toHaveLength(1);
      expect(result[0].expiresAt).toEqual(expiredDate);
    });
  });

  describe('getCodesByIdentifier', () => {
    it('should query all codes by email across all types', async () => {
      const mockCodes = [
        {
          id: 'code-1',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: new Date(),
          verified: true,
          verifiedAt: new Date(),
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'code-2',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash2',
          attempts: 2,
          maxAttempts: 3,
          expiresAt: new Date(),
          verified: false,
          invalidated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getCodesByIdentifier('test@example.com');

      expect(result).toHaveLength(2);
      expect(result.every(code => code.email === 'test@example.com')).toBe(true);
      expect(prisma.verificationCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });

    it('should query all codes by userId across all types', async () => {
      const mockCodes = [
        {
          id: 'code-1',
          email: 'new@example.com',
          userId: 'user-123',
          type: 'EMAIL_CHANGE',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: new Date(),
          verified: true,
          verifiedAt: new Date(),
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'code-2',
          email: null,
          phone: '+40123456789',
          userId: 'user-123',
          type: 'PHONE_CHANGE',
          codeHash: 'hash2',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: new Date(),
          verified: false,
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getCodesByIdentifier('user-123');

      expect(result).toHaveLength(2);
      expect(result.every(code => code.userId === 'user-123')).toBe(true);
      expect(prisma.verificationCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        })
      );
    });

    it('should return empty array if no codes found', async () => {
      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCodesByIdentifier('test@example.com');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.verificationCode.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.getCodesByIdentifier('test@example.com');

      expect(result).toHaveLength(0);
    });
  });

  describe('getExpiredCodes', () => {
    it('should query expired codes without identifier filter', async () => {
      const expiredDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const mockCodes = [
        {
          id: 'code-1',
          email: 'test1@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: expiredDate,
          verified: false,
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'code-2',
          email: 'test2@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash2',
          attempts: 1,
          maxAttempts: 3,
          expiresAt: expiredDate,
          verified: false,
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getExpiredCodes();

      expect(result).toHaveLength(2);
      expect(prisma.verificationCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should query expired codes with email identifier filter', async () => {
      const expiredDate = new Date(Date.now() - 30 * 60 * 1000);
      const mockCodes = [
        {
          id: 'code-1',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: expiredDate,
          verified: false,
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getExpiredCodes('test@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('test@example.com');
      expect(prisma.verificationCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
            OR: [
              { email: 'test@example.com' },
              { userId: 'test@example.com' },
            ],
          }),
        })
      );
    });

    it('should query expired codes with userId identifier filter', async () => {
      const expiredDate = new Date(Date.now() - 30 * 60 * 1000);
      const mockCodes = [
        {
          id: 'code-1',
          email: 'new@example.com',
          userId: 'user-123',
          type: 'EMAIL_CHANGE',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: expiredDate,
          verified: false,
          invalidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getExpiredCodes('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });

    it('should return empty array if no expired codes found', async () => {
      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getExpiredCodes();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.verificationCode.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.getExpiredCodes();

      expect(result).toHaveLength(0);
    });

    it('should not include non-expired codes', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      const mockCodes: any[] = [];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getExpiredCodes();

      expect(result).toHaveLength(0);
    });
  });

  describe('getCodeStatistics', () => {
    it('should return statistics for email identifier', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 10 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 10 * 60 * 1000);

      const mockCodes = [
        {
          id: 'code-1',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: futureDate,
          verified: false,
          invalidated: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'code-2',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash2',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: pastDate,
          verified: false,
          invalidated: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'code-3',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash3',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: futureDate,
          verified: true,
          verifiedAt: now,
          invalidated: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'code-4',
          email: 'test@example.com',
          userId: null,
          type: 'EMAIL_REGISTRATION',
          codeHash: 'hash4',
          attempts: 3,
          maxAttempts: 3,
          expiresAt: futureDate,
          verified: false,
          invalidated: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getCodeStatistics('test@example.com');

      expect(result.total).toBe(4);
      expect(result.verified).toBe(1);
      expect(result.expired).toBe(1);
      expect(result.invalidated).toBe(1);
      expect(result.pending).toBe(1);
    });

    it('should return statistics for userId identifier', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 10 * 60 * 1000);

      const mockCodes = [
        {
          id: 'code-1',
          email: 'new@example.com',
          userId: 'user-123',
          type: 'EMAIL_CHANGE',
          codeHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: futureDate,
          verified: true,
          verifiedAt: now,
          invalidated: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'code-2',
          email: null,
          phone: '+40123456789',
          userId: 'user-123',
          type: 'PHONE_CHANGE',
          codeHash: 'hash2',
          attempts: 0,
          maxAttempts: 3,
          expiresAt: futureDate,
          verified: false,
          invalidated: false,
          createdAt: now,
          updatedAt: now,
        },
      ];

      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue(mockCodes);

      const result = await service.getCodeStatistics('user-123');

      expect(result.total).toBe(2);
      expect(result.verified).toBe(1);
      expect(result.pending).toBe(1);
    });

    it('should return zero statistics if no codes found', async () => {
      (prisma.verificationCode.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCodeStatistics('test@example.com');

      expect(result.total).toBe(0);
      expect(result.verified).toBe(0);
      expect(result.expired).toBe(0);
      expect(result.invalidated).toBe(0);
      expect(result.pending).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.verificationCode.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.getCodeStatistics('test@example.com');

      expect(result.total).toBe(0);
      expect(result.verified).toBe(0);
      expect(result.expired).toBe(0);
      expect(result.invalidated).toBe(0);
      expect(result.pending).toBe(0);
    });
  });

  describe('invalidateCode', () => {
    it('should invalidate a verification code by ID', async () => {
      (prisma.verificationCode.update as jest.Mock).mockResolvedValue({
        id: 'code-123',
        invalidated: true,
      });

      await service.invalidateCode('code-123');

      expect(prisma.verificationCode.update).toHaveBeenCalledWith({
        where: { id: 'code-123' },
        data: { invalidated: true },
      });
    });

    it('should throw error if database operation fails', async () => {
      (prisma.verificationCode.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.invalidateCode('code-123')).rejects.toThrow('Database error');
    });

    it('should handle non-existent code ID', async () => {
      const error = new Error('Record not found');
      (error as any).code = 'P2025';
      (prisma.verificationCode.update as jest.Mock).mockRejectedValue(error);

      await expect(service.invalidateCode('non-existent-id')).rejects.toThrow('Record not found');
    });
  });
});
