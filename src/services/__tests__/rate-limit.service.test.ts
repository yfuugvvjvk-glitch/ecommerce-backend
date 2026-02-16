import { RateLimitService } from '../rate-limit.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    rateLimitAttempt: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
    jest.clearAllMocks();
  });

  describe('checkLimit', () => {
    it('should allow request when no rate limit record exists', async () => {
      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.checkLimit('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(4); // MAX_ATTEMPTS (5) - 1
      expect(result.resetTime).toBeUndefined();
      expect(result.waitTimeMinutes).toBeUndefined();
    });

    it('should allow request when rate limit window has expired', async () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 5,
        windowStart: pastDate,
        expiresAt: pastDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const result = await service.checkLimit('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(4);
    });

    it('should reject request when rate limit is exceeded', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 5,
        windowStart: new Date(),
        expiresAt: futureDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const result = await service.checkLimit('test@example.com');

      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.resetTime).toEqual(futureDate);
      expect(result.waitTimeMinutes).toBeGreaterThan(0);
      expect(result.waitTimeMinutes).toBeLessThanOrEqual(30);
    });

    it('should allow request when under the limit', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 3,
        windowStart: new Date(),
        expiresAt: futureDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const result = await service.checkLimit('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(1); // 5 - 3 - 1
      expect(result.resetTime).toEqual(futureDate);
    });

    it('should calculate wait time correctly', async () => {
      const futureDate = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes from now
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 5,
        windowStart: new Date(),
        expiresAt: futureDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const result = await service.checkLimit('test@example.com');

      expect(result.allowed).toBe(false);
      expect(result.waitTimeMinutes).toBeGreaterThanOrEqual(44);
      expect(result.waitTimeMinutes).toBeLessThanOrEqual(46);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.checkLimit('test@example.com');

      // Should fail open (allow request) on error
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);
    });

    it('should handle exactly at the limit (5th attempt)', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 4,
        windowStart: new Date(),
        expiresAt: futureDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const result = await service.checkLimit('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(0); // 5 - 4 - 1 = 0
    });
  });

  describe('recordAttempt', () => {
    it('should create new record when none exists', async () => {
      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.rateLimitAttempt.create as jest.Mock).mockResolvedValue({});

      await service.recordAttempt('test@example.com');

      expect(prisma.rateLimitAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifier: 'test@example.com',
            attempts: 1,
          }),
        })
      );
    });

    it('should increment attempts when record exists and window is active', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 2,
        windowStart: new Date(),
        expiresAt: futureDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);
      (prisma.rateLimitAttempt.update as jest.Mock).mockResolvedValue({});

      await service.recordAttempt('test@example.com');

      expect(prisma.rateLimitAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { identifier: 'test@example.com' },
          data: { attempts: 3 },
        })
      );
    });

    it('should reset window when expired', async () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 5,
        windowStart: pastDate,
        expiresAt: pastDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);
      (prisma.rateLimitAttempt.update as jest.Mock).mockResolvedValue({});

      await service.recordAttempt('test@example.com');

      expect(prisma.rateLimitAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { identifier: 'test@example.com' },
          data: expect.objectContaining({
            attempts: 1,
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw
      await expect(service.recordAttempt('test@example.com')).resolves.not.toThrow();
    });

    it('should set expiration time to 1 hour from now', async () => {
      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.rateLimitAttempt.create as jest.Mock).mockResolvedValue({});

      const beforeCall = Date.now();
      await service.recordAttempt('test@example.com');
      const afterCall = Date.now();

      const createCall = (prisma.rateLimitAttempt.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      const expiresAtTime = expiresAt.getTime();

      // Should be approximately 1 hour from now
      const oneHourFromBefore = beforeCall + 60 * 60 * 1000;
      const oneHourFromAfter = afterCall + 60 * 60 * 1000;

      expect(expiresAtTime).toBeGreaterThanOrEqual(oneHourFromBefore);
      expect(expiresAtTime).toBeLessThanOrEqual(oneHourFromAfter);
    });
  });

  describe('getRemainingWaitTime', () => {
    it('should return 0 when no rate limit record exists', async () => {
      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(null);

      const waitTime = await service.getRemainingWaitTime('test@example.com');

      expect(waitTime).toBe(0);
    });

    it('should return 0 when window has expired', async () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 5,
        windowStart: pastDate,
        expiresAt: pastDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const waitTime = await service.getRemainingWaitTime('test@example.com');

      expect(waitTime).toBe(0);
    });

    it('should return 0 when under the limit', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 3,
        windowStart: new Date(),
        expiresAt: futureDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const waitTime = await service.getRemainingWaitTime('test@example.com');

      expect(waitTime).toBe(0);
    });

    it('should return correct wait time when limit exceeded', async () => {
      const futureDate = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 5,
        windowStart: new Date(),
        expiresAt: futureDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const waitTime = await service.getRemainingWaitTime('test@example.com');

      expect(waitTime).toBeGreaterThanOrEqual(44);
      expect(waitTime).toBeLessThanOrEqual(46);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const waitTime = await service.getRemainingWaitTime('test@example.com');

      expect(waitTime).toBe(0);
    });

    it('should round up wait time to nearest minute', async () => {
      // 30 seconds from now
      const futureDate = new Date(Date.now() + 30 * 1000);
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 5,
        windowStart: new Date(),
        expiresAt: futureDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const waitTime = await service.getRemainingWaitTime('test@example.com');

      // Should round up to 1 minute
      expect(waitTime).toBe(1);
    });
  });

  describe('resetLimit', () => {
    it('should delete rate limit record', async () => {
      (prisma.rateLimitAttempt.delete as jest.Mock).mockResolvedValue({});

      await service.resetLimit('test@example.com');

      expect(prisma.rateLimitAttempt.delete).toHaveBeenCalledWith({
        where: { identifier: 'test@example.com' },
      });
    });

    it('should handle non-existent record gracefully', async () => {
      const error: any = new Error('Record not found');
      error.code = 'P2025'; // Prisma "Record not found" error code
      (prisma.rateLimitAttempt.delete as jest.Mock).mockRejectedValue(error);

      // Should not throw
      await expect(service.resetLimit('test@example.com')).resolves.not.toThrow();
    });

    it('should log other database errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Database error');
      (prisma.rateLimitAttempt.delete as jest.Mock).mockRejectedValue(error);

      await service.resetLimit('test@example.com');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error resetting rate limit:', error);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('should track 5 attempts correctly', async () => {
      let attempts = 0;
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockImplementation(() => {
        if (attempts === 0) return null;
        return {
          id: 'rate-limit-id',
          identifier: 'test@example.com',
          attempts,
          windowStart: new Date(),
          expiresAt: futureDate,
        };
      });

      (prisma.rateLimitAttempt.create as jest.Mock).mockImplementation(() => {
        attempts = 1;
        return {};
      });

      (prisma.rateLimitAttempt.update as jest.Mock).mockImplementation(({ data }) => {
        attempts = data.attempts;
        return {};
      });

      // First attempt
      let result = await service.checkLimit('test@example.com');
      expect(result.allowed).toBe(true);
      await service.recordAttempt('test@example.com');

      // Attempts 2-5
      for (let i = 2; i <= 5; i++) {
        result = await service.checkLimit('test@example.com');
        expect(result.allowed).toBe(true);
        await service.recordAttempt('test@example.com');
      }

      // 6th attempt should be blocked
      result = await service.checkLimit('test@example.com');
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
    });

    it('should reset after window expires', async () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const mockRecord = {
        id: 'rate-limit-id',
        identifier: 'test@example.com',
        attempts: 5,
        windowStart: pastDate,
        expiresAt: pastDate,
      };

      (prisma.rateLimitAttempt.findUnique as jest.Mock).mockResolvedValue(mockRecord);
      (prisma.rateLimitAttempt.update as jest.Mock).mockResolvedValue({});

      // Should allow after expiration
      const result = await service.checkLimit('test@example.com');
      expect(result.allowed).toBe(true);

      // Recording should reset the window
      await service.recordAttempt('test@example.com');
      expect(prisma.rateLimitAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attempts: 1,
          }),
        })
      );
    });
  });
});
