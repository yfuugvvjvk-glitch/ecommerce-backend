import { prisma } from '../../utils/prisma';

// Mock prisma BEFORE importing the module under test
jest.mock('../../utils/prisma', () => ({
  prisma: {
    verificationCode: {
      deleteMany: jest.fn(),
    },
    accountLockout: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    pendingUser: {
      deleteMany: jest.fn(),
    },
  },
}));

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn((schedule, callback) => {
    // Return an object that stores the callback
    return { schedule, callback };
  }),
}));

// Import after mocks are set up
import cron from 'node-cron';
import {
  scheduleVerificationCleanup,
  scheduleAccountLockoutCleanup,
  schedulePendingUserCleanup,
} from '../verification-cleanup.job';

describe('Verification Cleanup Jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleVerificationCleanup', () => {
    it('should schedule verification code cleanup job', () => {
      scheduleVerificationCleanup();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function)
      );
    });

    it('should delete verification codes older than 24 hours', async () => {
      // Mock the deleteMany response
      (prisma.verificationCode.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      scheduleVerificationCleanup();

      // Get the scheduled callback
      const scheduledCallback = (cron.schedule as jest.Mock).mock.results[0]
        .value.callback;

      // Execute the callback
      await scheduledCallback();

      // Verify deleteMany was called with correct date filter
      expect(prisma.verificationCode.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });

      // Verify the date is approximately 24 hours ago
      const callArgs = (prisma.verificationCode.deleteMany as jest.Mock).mock
        .calls[0][0];
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateDiff = Math.abs(
        callArgs.where.createdAt.lt.getTime() - twentyFourHoursAgo.getTime()
      );
      expect(dateDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should handle errors gracefully during cleanup', async () => {
      // Mock console.error to verify error handling
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      // Mock deleteMany to throw an error
      (prisma.verificationCode.deleteMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      scheduleVerificationCleanup();

      // Get the scheduled callback
      const scheduledCallback = (cron.schedule as jest.Mock).mock.results[0]
        .value.callback;

      // Execute the callback
      await scheduledCallback();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Eroare la ștergerea codurilor de verificare:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('scheduleAccountLockoutCleanup', () => {
    it('should schedule account lockout cleanup job', () => {
      scheduleAccountLockoutCleanup();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 3 * * *',
        expect.any(Function)
      );
    });

    it('should unlock expired account lockouts', async () => {
      const mockLockouts = [
        {
          id: 'lockout-1',
          identifier: 'user1@example.com',
          expiresAt: new Date(Date.now() - 1000),
          unlocked: false,
        },
        {
          id: 'lockout-2',
          identifier: 'user2@example.com',
          expiresAt: new Date(Date.now() - 2000),
          unlocked: false,
        },
      ];

      (prisma.accountLockout.findMany as jest.Mock).mockResolvedValue(
        mockLockouts
      );
      (prisma.accountLockout.update as jest.Mock).mockResolvedValue({});

      scheduleAccountLockoutCleanup();

      // Get the scheduled callback
      const scheduledCallback = (cron.schedule as jest.Mock).mock.results[0]
        .value.callback;

      // Execute the callback
      await scheduledCallback();

      // Verify findMany was called with correct filters
      expect(prisma.accountLockout.findMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
          unlocked: false,
        },
      });

      // Verify update was called for each expired lockout
      expect(prisma.accountLockout.update).toHaveBeenCalledTimes(2);
      expect(prisma.accountLockout.update).toHaveBeenCalledWith({
        where: { id: 'lockout-1' },
        data: {
          unlocked: true,
          unlockedAt: expect.any(Date),
        },
      });
      expect(prisma.accountLockout.update).toHaveBeenCalledWith({
        where: { id: 'lockout-2' },
        data: {
          unlocked: true,
          unlockedAt: expect.any(Date),
        },
      });
    });

    it('should handle no expired lockouts', async () => {
      (prisma.accountLockout.findMany as jest.Mock).mockResolvedValue([]);

      scheduleAccountLockoutCleanup();

      // Get the scheduled callback
      const scheduledCallback = (cron.schedule as jest.Mock).mock.results[0]
        .value.callback;

      // Execute the callback
      await scheduledCallback();

      // Verify update was not called
      expect(prisma.accountLockout.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully during unlock', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      (prisma.accountLockout.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      scheduleAccountLockoutCleanup();

      // Get the scheduled callback
      const scheduledCallback = (cron.schedule as jest.Mock).mock.results[0]
        .value.callback;

      // Execute the callback
      await scheduledCallback();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Eroare la deblocarea conturilor:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('schedulePendingUserCleanup', () => {
    it('should schedule pending user cleanup job', () => {
      schedulePendingUserCleanup();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 4 * * *',
        expect.any(Function)
      );
    });

    it('should delete expired pending users', async () => {
      (prisma.pendingUser.deleteMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      schedulePendingUserCleanup();

      // Get the scheduled callback
      const scheduledCallback = (cron.schedule as jest.Mock).mock.results[0]
        .value.callback;

      // Execute the callback
      await scheduledCallback();

      // Verify deleteMany was called with correct filter
      expect(prisma.pendingUser.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should handle errors gracefully during pending user cleanup', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      (prisma.pendingUser.deleteMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      schedulePendingUserCleanup();

      // Get the scheduled callback
      const scheduledCallback = (cron.schedule as jest.Mock).mock.results[0]
        .value.callback;

      // Execute the callback
      await scheduledCallback();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Eroare la ștergerea utilizatorilor în așteptare:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 24 hours old verification codes', async () => {
      (prisma.verificationCode.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      scheduleVerificationCleanup();

      const scheduledCallback = (cron.schedule as jest.Mock).mock.results[0]
        .value.callback;
      await scheduledCallback();

      const callArgs = (prisma.verificationCode.deleteMany as jest.Mock).mock
        .calls[0][0];
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Verify the date is exactly 24 hours (within 1 second tolerance)
      const dateDiff = Math.abs(
        callArgs.where.createdAt.lt.getTime() - twentyFourHoursAgo.getTime()
      );
      expect(dateDiff).toBeLessThan(1000);
    });

    it('should handle concurrent lockout updates', async () => {
      const mockLockouts = Array.from({ length: 10 }, (_, i) => ({
        id: `lockout-${i}`,
        identifier: `user${i}@example.com`,
        expiresAt: new Date(Date.now() - 1000),
        unlocked: false,
      }));

      (prisma.accountLockout.findMany as jest.Mock).mockResolvedValue(
        mockLockouts
      );
      (prisma.accountLockout.update as jest.Mock).mockResolvedValue({});

      scheduleAccountLockoutCleanup();

      const scheduledCallback = (cron.schedule as jest.Mock).mock.results[0]
        .value.callback;
      await scheduledCallback();

      // Verify all lockouts were updated
      expect(prisma.accountLockout.update).toHaveBeenCalledTimes(10);
    });
  });
});
