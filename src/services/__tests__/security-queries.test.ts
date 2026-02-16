import { SecurityService, SecurityEventType } from '../security.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    securityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    accountLockout: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('SecurityService - Database Query Methods', () => {
  let service: SecurityService;

  beforeEach(() => {
    service = new SecurityService();
    jest.clearAllMocks();
  });

  describe('getSecurityEventsByIdentifier', () => {
    it('should query security events by email', async () => {
      const mockEvents = [
        {
          id: 'log-1',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_SENT,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_SUCCESS,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockEvents);

      const result = await service.getSecurityEventsByIdentifier('test@example.com');

      expect(result).toHaveLength(2);
      expect(result.every(event => event.email === 'test@example.com')).toBe(true);
      expect(prisma.securityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });

    it('should query security events by userId', async () => {
      const mockEvents = [
        {
          id: 'log-1',
          userId: 'user-123',
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.EMAIL_CHANGED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockEvents);

      const result = await service.getSecurityEventsByIdentifier('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
      expect(prisma.securityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        })
      );
    });

    it('should filter by event type when provided', async () => {
      const mockEvents = [
        {
          id: 'log-1',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockEvents);

      const result = await service.getSecurityEventsByIdentifier(
        'test@example.com',
        SecurityEventType.VERIFICATION_FAILED
      );

      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe(SecurityEventType.VERIFICATION_FAILED);
      expect(prisma.securityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'test@example.com',
            eventType: SecurityEventType.VERIFICATION_FAILED,
          }),
        })
      );
    });

    it('should limit results when limit is provided', async () => {
      const mockEvents = Array.from({ length: 5 }, (_, i) => ({
        id: `log-${i}`,
        userId: null,
        email: 'test@example.com',
        phone: null,
        eventType: SecurityEventType.VERIFICATION_SENT,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
        createdAt: new Date(),
      }));

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockEvents.slice(0, 3));

      const result = await service.getSecurityEventsByIdentifier('test@example.com', undefined, 3);

      expect(result).toHaveLength(3);
      expect(prisma.securityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 3,
        })
      );
    });

    it('should return empty array if no events found', async () => {
      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSecurityEventsByIdentifier('test@example.com');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.securityLog.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.getSecurityEventsByIdentifier('test@example.com');

      expect(result).toHaveLength(0);
    });
  });

  describe('getSecurityEventsByType', () => {
    it('should query security events by type', async () => {
      const mockEvents = [
        {
          id: 'log-1',
          userId: null,
          email: 'test1@example.com',
          phone: null,
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          userId: 'user-123',
          email: 'test2@example.com',
          phone: null,
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockEvents);

      const result = await service.getSecurityEventsByType(SecurityEventType.ACCOUNT_LOCKED);

      expect(result).toHaveLength(2);
      expect(result.every(event => event.eventType === SecurityEventType.ACCOUNT_LOCKED)).toBe(true);
      expect(prisma.securityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventType: SecurityEventType.ACCOUNT_LOCKED },
        })
      );
    });

    it('should limit results when limit is provided', async () => {
      const mockEvents = Array.from({ length: 10 }, (_, i) => ({
        id: `log-${i}`,
        userId: null,
        email: `test${i}@example.com`,
        phone: null,
        eventType: SecurityEventType.VERIFICATION_FAILED,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
        createdAt: new Date(),
      }));

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockEvents.slice(0, 5));

      const result = await service.getSecurityEventsByType(SecurityEventType.VERIFICATION_FAILED, 5);

      expect(result).toHaveLength(5);
      expect(prisma.securityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should return empty array if no events found', async () => {
      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSecurityEventsByType(SecurityEventType.ACCOUNT_LOCKED);

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.securityLog.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.getSecurityEventsByType(SecurityEventType.ACCOUNT_LOCKED);

      expect(result).toHaveLength(0);
    });
  });

  describe('getSecurityStatistics', () => {
    it('should return statistics for email identifier', async () => {
      const mockEvents = [
        {
          id: 'log-1',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_SENT,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_SUCCESS,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'log-3',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'log-4',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockEvents);
      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getSecurityStatistics('test@example.com');

      expect(result.totalEvents).toBe(4);
      expect(result.verificationsSent).toBe(1);
      expect(result.verificationsSucceeded).toBe(1);
      expect(result.verificationsFailed).toBe(2);
      expect(result.accountLocked).toBe(false);
    });

    it('should return statistics for userId identifier', async () => {
      const mockEvents = [
        {
          id: 'log-1',
          userId: 'user-123',
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.EMAIL_CHANGED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          userId: 'user-123',
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.PASSWORD_CHANGED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockEvents);
      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getSecurityStatistics('user-123');

      expect(result.totalEvents).toBe(2);
      expect(result.accountLocked).toBe(false);
    });

    it('should include lockout status and last lockout date', async () => {
      const lockoutDate = new Date();
      const mockEvents = [
        {
          id: 'log-1',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
          createdAt: lockoutDate,
        },
      ];

      const mockLockout = {
        id: 'lockout-1',
        identifier: 'test@example.com',
        reason: 'Too many failed attempts',
        lockedAt: lockoutDate,
        expiresAt: new Date(lockoutDate.getTime() + 60 * 60 * 1000),
        unlocked: false,
        unlockedAt: null,
      };

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockEvents);
      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(mockLockout);

      const result = await service.getSecurityStatistics('test@example.com');

      expect(result.accountLocked).toBe(true);
      expect(result.lastLockoutDate).toEqual(lockoutDate);
    });

    it('should return zero statistics if no events found', async () => {
      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getSecurityStatistics('test@example.com');

      expect(result.totalEvents).toBe(0);
      expect(result.verificationsSent).toBe(0);
      expect(result.verificationsSucceeded).toBe(0);
      expect(result.verificationsFailed).toBe(0);
      expect(result.accountLocked).toBe(false);
      expect(result.lastLockoutDate).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      (prisma.securityLog.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));
      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getSecurityStatistics('test@example.com');

      expect(result.totalEvents).toBe(0);
      expect(result.verificationsSent).toBe(0);
      expect(result.verificationsSucceeded).toBe(0);
      expect(result.verificationsFailed).toBe(0);
      expect(result.accountLocked).toBe(false);
    });
  });

  describe('getRecentFailedAttempts', () => {
    it('should query recent failed attempts by email', async () => {
      const mockAttempts = [
        {
          id: 'log-1',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: { verificationType: 'EMAIL_REGISTRATION' },
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          metadata: { verificationType: 'EMAIL_REGISTRATION' },
          createdAt: new Date(),
        },
      ];

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockAttempts);

      const result = await service.getRecentFailedAttempts('test@example.com');

      expect(result).toHaveLength(2);
      expect(result.every(attempt => attempt.eventType === SecurityEventType.VERIFICATION_FAILED)).toBe(true);
      expect(prisma.securityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'test@example.com',
            eventType: SecurityEventType.VERIFICATION_FAILED,
          }),
        })
      );
    });

    it('should query recent failed attempts by userId', async () => {
      const mockAttempts = [
        {
          id: 'log-1',
          userId: 'user-123',
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: { verificationType: 'EMAIL_CHANGE' },
          createdAt: new Date(),
        },
      ];

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockAttempts);

      const result = await service.getRecentFailedAttempts('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });

    it('should limit results to specified limit', async () => {
      const mockAttempts = Array.from({ length: 20 }, (_, i) => ({
        id: `log-${i}`,
        userId: null,
        email: 'test@example.com',
        phone: null,
        eventType: SecurityEventType.VERIFICATION_FAILED,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
        createdAt: new Date(),
      }));

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockAttempts.slice(0, 5));

      const result = await service.getRecentFailedAttempts('test@example.com', 5);

      expect(result).toHaveLength(5);
      expect(prisma.securityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should use default limit of 10 if not specified', async () => {
      const mockAttempts = Array.from({ length: 10 }, (_, i) => ({
        id: `log-${i}`,
        userId: null,
        email: 'test@example.com',
        phone: null,
        eventType: SecurityEventType.VERIFICATION_FAILED,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
        createdAt: new Date(),
      }));

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockAttempts);

      const result = await service.getRecentFailedAttempts('test@example.com');

      expect(result).toHaveLength(10);
      expect(prisma.securityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should return empty array if no failed attempts found', async () => {
      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentFailedAttempts('test@example.com');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.securityLog.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.getRecentFailedAttempts('test@example.com');

      expect(result).toHaveLength(0);
    });

    it('should include IP address and metadata in results', async () => {
      const mockAttempts = [
        {
          id: 'log-1',
          userId: null,
          email: 'test@example.com',
          phone: null,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: { verificationType: 'EMAIL_REGISTRATION', attemptNumber: 1 },
          createdAt: new Date(),
        },
      ];

      (prisma.securityLog.findMany as jest.Mock).mockResolvedValue(mockAttempts);

      const result = await service.getRecentFailedAttempts('test@example.com');

      expect(result[0].ipAddress).toBe('192.168.1.1');
      expect(result[0].metadata).toEqual({ verificationType: 'EMAIL_REGISTRATION', attemptNumber: 1 });
    });
  });
});
