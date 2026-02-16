import { SecurityService, SecurityEventType, VerificationType } from '../security.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    securityLog: {
      create: jest.fn(),
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

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(() => {
    service = new SecurityService();
    jest.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    it('should log a security event with all fields', async () => {
      const event = {
        userId: 'user123',
        email: 'test@example.com',
        eventType: SecurityEventType.VERIFICATION_FAILED,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { reason: 'Invalid code' },
      };

      (prisma.securityLog.create as jest.Mock).mockResolvedValue({
        id: 'log_123',
        ...event,
        createdAt: new Date(),
      });

      await service.logSecurityEvent(event);

      expect(prisma.securityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          email: 'test@example.com',
          eventType: SecurityEventType.VERIFICATION_FAILED,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: { reason: 'Invalid code' },
        }),
      });
    });

    it('should log a security event with minimal fields', async () => {
      const event = {
        email: 'test@example.com',
        eventType: SecurityEventType.VERIFICATION_SUCCESS,
      };

      (prisma.securityLog.create as jest.Mock).mockResolvedValue({
        id: 'log_124',
        ...event,
        createdAt: new Date(),
      });

      await service.logSecurityEvent(event);

      expect(prisma.securityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          eventType: SecurityEventType.VERIFICATION_SUCCESS,
          metadata: {},
        }),
      });
    });
  });

  describe('getFailedAttemptCount', () => {
    it('should count failed attempts within the time window', async () => {
      const identifier = 'test@example.com';
      const windowHours = 1;

      (prisma.securityLog.count as jest.Mock).mockResolvedValue(5);

      const count = await service.getFailedAttemptCount(identifier, windowHours);

      expect(count).toBe(5);
      expect(prisma.securityLog.count).toHaveBeenCalledWith({
        where: {
          email: identifier,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should return 0 when no failed attempts exist', async () => {
      const identifier = 'test@example.com';
      const windowHours = 1;

      (prisma.securityLog.count as jest.Mock).mockResolvedValue(0);

      const count = await service.getFailedAttemptCount(identifier, windowHours);

      expect(count).toBe(0);
    });

    it('should use correct time window', async () => {
      const identifier = 'test@example.com';
      const windowHours = 2;

      (prisma.securityLog.count as jest.Mock).mockResolvedValue(3);

      await service.getFailedAttemptCount(identifier, windowHours);

      const callArgs = (prisma.securityLog.count as jest.Mock).mock.calls[0][0];
      const windowStart = callArgs.where.createdAt.gte;
      const now = new Date();
      const expectedWindowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(windowStart.getTime() - expectedWindowStart.getTime())).toBeLessThan(1000);
    });
  });

  describe('isAccountLocked', () => {
    it('should return false when no lockout exists', async () => {
      const identifier = 'test@example.com';

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(null);

      const isLocked = await service.isAccountLocked(identifier);

      expect(isLocked).toBe(false);
      expect(prisma.accountLockout.findUnique).toHaveBeenCalledWith({
        where: { identifier },
      });
    });

    it('should return true when account is locked and not expired', async () => {
      const identifier = 'test@example.com';
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue({
        id: 'lockout_123',
        identifier,
        reason: 'Too many failed attempts',
        lockedAt: new Date(),
        expiresAt: futureDate,
        unlocked: false,
      });

      const isLocked = await service.isAccountLocked(identifier);

      expect(isLocked).toBe(true);
    });

    it('should return false when account lockout has expired', async () => {
      const identifier = 'test@example.com';
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue({
        id: 'lockout_123',
        identifier,
        reason: 'Too many failed attempts',
        lockedAt: new Date(),
        expiresAt: pastDate,
        unlocked: false,
      });

      (prisma.accountLockout.update as jest.Mock).mockResolvedValue({});
      (prisma.securityLog.create as jest.Mock).mockResolvedValue({});

      const isLocked = await service.isAccountLocked(identifier);

      expect(isLocked).toBe(false);
      // Should automatically unlock
      expect(prisma.accountLockout.update).toHaveBeenCalled();
    });

    it('should return false when account is already unlocked', async () => {
      const identifier = 'test@example.com';

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue({
        id: 'lockout_123',
        identifier,
        reason: 'Too many failed attempts',
        lockedAt: new Date(),
        expiresAt: new Date(),
        unlocked: true,
        unlockedAt: new Date(),
      });

      const isLocked = await service.isAccountLocked(identifier);

      expect(isLocked).toBe(false);
    });
  });

  describe('lockAccount', () => {
    it('should create a new lockout record', async () => {
      const identifier = 'test@example.com';
      const reason = 'Too many failed attempts';

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.accountLockout.upsert as jest.Mock).mockResolvedValue({
        id: 'lockout_123',
        identifier,
        reason,
        lockedAt: new Date(),
        expiresAt: new Date(),
        unlocked: false,
      });
      (prisma.securityLog.create as jest.Mock).mockResolvedValue({});

      await service.lockAccount(identifier, reason);

      expect(prisma.accountLockout.upsert).toHaveBeenCalledWith({
        where: { identifier },
        create: expect.objectContaining({
          identifier,
          reason,
          unlocked: false,
        }),
        update: expect.objectContaining({
          reason,
          unlocked: false,
        }),
      });

      expect(prisma.securityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: identifier,
          eventType: SecurityEventType.ACCOUNT_LOCKED,
        }),
      });
    });

    it('should not lock if already locked', async () => {
      const identifier = 'test@example.com';
      const reason = 'Too many failed attempts';

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue({
        id: 'lockout_123',
        identifier,
        reason: 'Already locked',
        lockedAt: new Date(),
        expiresAt: new Date(),
        unlocked: false,
      });

      await service.lockAccount(identifier, reason);

      expect(prisma.accountLockout.upsert).not.toHaveBeenCalled();
    });

    it('should set expiration time to 1 hour from now', async () => {
      const identifier = 'test@example.com';
      const reason = 'Too many failed attempts';

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.accountLockout.upsert as jest.Mock).mockResolvedValue({});
      (prisma.securityLog.create as jest.Mock).mockResolvedValue({});

      await service.lockAccount(identifier, reason);

      const callArgs = (prisma.accountLockout.upsert as jest.Mock).mock.calls[0][0];
      const expiresAt = callArgs.create.expiresAt;
      const now = new Date();
      const expectedExpiration = new Date(now.getTime() + 60 * 60 * 1000);

      // Allow 1 second tolerance
      expect(Math.abs(expiresAt.getTime() - expectedExpiration.getTime())).toBeLessThan(1000);
    });
  });

  describe('unlockAccount', () => {
    it('should unlock a locked account', async () => {
      const identifier = 'test@example.com';

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue({
        id: 'lockout_123',
        identifier,
        reason: 'Too many failed attempts',
        lockedAt: new Date(),
        expiresAt: new Date(),
        unlocked: false,
      });
      (prisma.accountLockout.update as jest.Mock).mockResolvedValue({});
      (prisma.securityLog.create as jest.Mock).mockResolvedValue({});

      await service.unlockAccount(identifier);

      expect(prisma.accountLockout.update).toHaveBeenCalledWith({
        where: { identifier },
        data: {
          unlocked: true,
          unlockedAt: expect.any(Date),
        },
      });

      expect(prisma.securityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: identifier,
          eventType: SecurityEventType.ACCOUNT_UNLOCKED,
        }),
      });
    });

    it('should not unlock if no lockout exists', async () => {
      const identifier = 'test@example.com';

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(null);

      await service.unlockAccount(identifier);

      expect(prisma.accountLockout.update).not.toHaveBeenCalled();
      expect(prisma.securityLog.create).not.toHaveBeenCalled();
    });

    it('should not unlock if already unlocked', async () => {
      const identifier = 'test@example.com';

      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue({
        id: 'lockout_123',
        identifier,
        reason: 'Too many failed attempts',
        lockedAt: new Date(),
        expiresAt: new Date(),
        unlocked: true,
        unlockedAt: new Date(),
      });

      await service.unlockAccount(identifier);

      expect(prisma.accountLockout.update).not.toHaveBeenCalled();
    });
  });

  describe('recordVerificationAttempt', () => {
    it('should log successful verification attempt', async () => {
      const identifier = 'test@example.com';
      const type = VerificationType.EMAIL_REGISTRATION;
      const ipAddress = '192.168.1.1';

      (prisma.securityLog.create as jest.Mock).mockResolvedValue({});

      await service.recordVerificationAttempt(identifier, type, true, ipAddress);

      expect(prisma.securityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: identifier,
          eventType: SecurityEventType.VERIFICATION_SUCCESS,
          ipAddress,
          metadata: {
            verificationType: type,
            success: true,
          },
        }),
      });
    });

    it('should log failed verification attempt', async () => {
      const identifier = 'test@example.com';
      const type = VerificationType.EMAIL_REGISTRATION;
      const ipAddress = '192.168.1.1';

      (prisma.securityLog.create as jest.Mock).mockResolvedValue({});
      (prisma.securityLog.count as jest.Mock).mockResolvedValue(5);

      await service.recordVerificationAttempt(identifier, type, false, ipAddress);

      expect(prisma.securityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: identifier,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          ipAddress,
          metadata: {
            verificationType: type,
            success: false,
          },
        }),
      });
    });

    it('should lock account after 10 failed attempts', async () => {
      const identifier = 'test@example.com';
      const type = VerificationType.EMAIL_REGISTRATION;

      (prisma.securityLog.create as jest.Mock).mockResolvedValue({});
      (prisma.securityLog.count as jest.Mock).mockResolvedValue(10);
      (prisma.accountLockout.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.accountLockout.upsert as jest.Mock).mockResolvedValue({});

      await service.recordVerificationAttempt(identifier, type, false);

      expect(prisma.accountLockout.upsert).toHaveBeenCalled();
    });

    it('should not lock account if failed attempts are below threshold', async () => {
      const identifier = 'test@example.com';
      const type = VerificationType.EMAIL_REGISTRATION;

      (prisma.securityLog.create as jest.Mock).mockResolvedValue({});
      (prisma.securityLog.count as jest.Mock).mockResolvedValue(5);

      await service.recordVerificationAttempt(identifier, type, false);

      expect(prisma.accountLockout.upsert).not.toHaveBeenCalled();
    });
  });
});
