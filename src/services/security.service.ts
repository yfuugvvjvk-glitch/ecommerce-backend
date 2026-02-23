import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Security Event Types
 * 
 * Enum defining all possible security events that can be logged.
 */
export enum SecurityEventType {
  VERIFICATION_SENT = 'VERIFICATION_SENT',
  VERIFICATION_SUCCESS = 'VERIFICATION_SUCCESS',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  CODE_EXPIRED = 'CODE_EXPIRED',
  CODE_INVALIDATED = 'CODE_INVALIDATED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  EMAIL_CHANGED = 'EMAIL_CHANGED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PHONE_CHANGED = 'PHONE_CHANGED',
}

/**
 * Verification Type
 * 
 * Enum defining the types of verification operations.
 */
export enum VerificationType {
  EMAIL_REGISTRATION = 'EMAIL_REGISTRATION',
  EMAIL_CHANGE = 'EMAIL_CHANGE',
  PHONE_CHANGE = 'PHONE_CHANGE',
}

/**
 * Security Event Interface
 * 
 * Structure for logging security events.
 */
export interface SecurityEvent {
  userId?: string;
  email?: string;
  eventType: SecurityEventType;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

/**
 * Security Service
 * 
 * Handles security-related operations including:
 * - Tracking verification attempts (failed and successful)
 * - Managing account lockouts (10 failed attempts in 1 hour)
 * - Logging security events for audit purposes
 * - Automatic account unlock after 1 hour
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6
 */
export class SecurityService {
  private readonly LOCKOUT_THRESHOLD = 10; // Lock after 10 failed attempts
  private readonly LOCKOUT_WINDOW_HOURS = 1; // Count failures within 1 hour
  private readonly LOCKOUT_DURATION_HOURS = 1; // Lock for 1 hour

  /**
   * Record a verification attempt (success or failure).
   * 
   * @param identifier - User identifier (email or user ID)
   * @param type - Type of verification being attempted
   * @param success - Whether the attempt was successful
   * @param ipAddress - Optional IP address of the attempt
   * @returns Promise that resolves when the attempt is recorded
   * 
   * Requirement 7.1: Record each failed attempt with timestamp and IP address
   */
  async recordVerificationAttempt(
    identifier: string,
    type: VerificationType,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    try {
      // Log the security event
      await this.logSecurityEvent({
        email: identifier,
        eventType: success ? SecurityEventType.VERIFICATION_SUCCESS : SecurityEventType.VERIFICATION_FAILED,
        ipAddress,
        metadata: {
          verificationType: type,
          success,
        },
      });

      // If the attempt failed, check if we need to lock the account
      if (!success) {
        const failedCount = await this.getFailedAttemptCount(identifier, this.LOCKOUT_WINDOW_HOURS);
        
        // Lock account if threshold is reached
        if (failedCount >= this.LOCKOUT_THRESHOLD) {
          await this.lockAccount(
            identifier,
            `Account locked due to ${this.LOCKOUT_THRESHOLD} failed verification attempts within ${this.LOCKOUT_WINDOW_HOURS} hour(s)`
          );
        }
      }
    } catch (error) {
      console.error('Error recording verification attempt:', error);
      throw error;
    }
  }

  /**
   * Check if an account is currently locked.
   * 
   * @param identifier - User identifier (email or user ID)
   * @returns Promise resolving to true if account is locked, false otherwise
   * 
   * Requirement 7.3: Reject all verification attempts for locked accounts
   */
  async isAccountLocked(identifier: string): Promise<boolean> {
    try {
      const lockout = await prisma.accountLockout.findUnique({
        where: { identifier },
      });

      if (!lockout) {
        return false;
      }

      // Check if lockout has expired
      if (new Date() > lockout.expiresAt && !lockout.unlocked) {
        // Automatically unlock expired lockouts
        await this.unlockAccount(identifier);
        return false;
      }

      // Account is locked if not unlocked and not expired
      return !lockout.unlocked;
    } catch (error) {
      console.error('Error checking account lockout status:', error);
      throw error;
    }
  }

  /**
   * Get the count of failed verification attempts within a time window.
   * 
   * @param identifier - User identifier (email or user ID)
   * @param windowHours - Time window in hours to count failures
   * @returns Promise resolving to the count of failed attempts
   * 
   * Requirement 7.2: Track failed attempts within 1-hour window
   */
  async getFailedAttemptCount(
    identifier: string,
    windowHours: number
  ): Promise<number> {
    try {
      const windowStart = new Date();
      windowStart.setHours(windowStart.getHours() - windowHours);

      const failedAttempts = await prisma.securityLog.count({
        where: {
          email: identifier,
          eventType: SecurityEventType.VERIFICATION_FAILED,
          createdAt: {
            gte: windowStart,
          },
        },
      });

      return failedAttempts;
    } catch (error) {
      console.error('Error getting failed attempt count:', error);
      throw error;
    }
  }

  /**
   * Lock an account due to excessive failed attempts.
   * 
   * @param identifier - User identifier (email or user ID)
   * @param reason - Reason for the lockout
   * @returns Promise that resolves when the account is locked
   * 
   * Requirement 7.2: Lock account after 10 failed attempts in 1 hour
   * Requirement 7.6: Log lockout events
   */
  async lockAccount(identifier: string, reason: string): Promise<void> {
    try {
      // Check if already locked
      const existingLockout = await prisma.accountLockout.findUnique({
        where: { identifier },
      });

      if (existingLockout && !existingLockout.unlocked) {
        // Already locked, no need to lock again
        return;
      }

      // Calculate expiration time (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.LOCKOUT_DURATION_HOURS);

      // Create or update lockout record
      await prisma.accountLockout.upsert({
        where: { identifier },
        create: {
          id: `lockout_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          identifier,
          reason,
          expiresAt,
          unlocked: false,
        },
        update: {
          reason,
          lockedAt: new Date(),
          expiresAt,
          unlocked: false,
          unlockedAt: null,
        },
      });

      // Log the lockout event
      await this.logSecurityEvent({
        email: identifier,
        eventType: SecurityEventType.ACCOUNT_LOCKED,
        metadata: {
          reason,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error locking account:', error);
      throw error;
    }
  }

  /**
   * Unlock an account (automatic unlock after expiration).
   * 
   * @param identifier - User identifier (email or user ID)
   * @returns Promise that resolves when the account is unlocked
   * 
   * Requirement 7.5: Automatically unlock account after 1 hour
   * Requirement 7.6: Log unlock events
   */
  async unlockAccount(identifier: string): Promise<void> {
    try {
      const lockout = await prisma.accountLockout.findUnique({
        where: { identifier },
      });

      if (!lockout || lockout.unlocked) {
        // No lockout or already unlocked
        return;
      }

      // Update lockout record to mark as unlocked
      await prisma.accountLockout.update({
        where: { identifier },
        data: {
          unlocked: true,
          unlockedAt: new Date(),
        },
      });

      // Log the unlock event
      await this.logSecurityEvent({
        email: identifier,
        eventType: SecurityEventType.ACCOUNT_UNLOCKED,
        metadata: {
          reason: 'Automatic unlock after expiration',
        },
      });
    } catch (error) {
      console.error('Error unlocking account:', error);
      throw error;
    }
  }

  /**
   * Log a security event for audit purposes.
   * 
   * @param event - Security event to log
   * @returns Promise that resolves when the event is logged
   * 
   * Requirement 7.6: Log all lockout events with user identifier, timestamp, and reason
   * Requirement 7.1: Record failed attempts with timestamp and IP address
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await prisma.securityLog.create({
        data: {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId: event.userId,
          email: event.email,
          eventType: event.eventType,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          metadata: event.metadata || {},
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error logging security event:', error);
      throw error;
    }
  }

  /**
   * Query security events by user identifier.
   * Returns all security events for a user for audit purposes.
   * 
   * @param identifier - User identifier (email or user ID)
   * @param eventType - Optional event type filter
   * @param limit - Optional limit on number of results
   * @returns Promise resolving to array of security events
   * 
   * Requirements: 9.3 - Store all security events for audit purposes
   */
  async getSecurityEventsByIdentifier(
    identifier: string,
    eventType?: SecurityEventType,
    limit?: number
  ): Promise<any[]> {
    try {
      const isEmail = identifier.includes('@');
      
      const events = await prisma.securityLog.findMany({
        where: {
          ...(isEmail ? { email: identifier } : { userId: identifier }),
          ...(eventType && { eventType }),
        },
        orderBy: {
          createdAt: 'desc',
        },
        ...(limit && { take: limit }),
      });

      return events;
    } catch (error) {
      console.error('Error querying security events:', error);
      return [];
    }
  }

  /**
   * Query security events by event type.
   * Returns all security events of a specific type for monitoring purposes.
   * 
   * @param eventType - Security event type
   * @param limit - Optional limit on number of results
   * @returns Promise resolving to array of security events
   * 
   * Requirements: 9.3 - Store all security events for audit purposes
   */
  async getSecurityEventsByType(
    eventType: SecurityEventType,
    limit?: number
  ): Promise<any[]> {
    try {
      const events = await prisma.securityLog.findMany({
        where: { eventType },
        orderBy: {
          createdAt: 'desc',
        },
        ...(limit && { take: limit }),
      });

      return events;
    } catch (error) {
      console.error('Error querying security events by type:', error);
      return [];
    }
  }

  /**
   * Get security event statistics for a user.
   * Returns counts of events by type for monitoring purposes.
   * 
   * @param identifier - User identifier (email or user ID)
   * @returns Promise resolving to statistics object
   * 
   * Requirements: 9.3 - Store all security events for audit purposes
   */
  async getSecurityStatistics(identifier: string): Promise<{
    totalEvents: number;
    verificationsSent: number;
    verificationsSucceeded: number;
    verificationsFailed: number;
    accountLocked: boolean;
    lastLockoutDate?: Date;
  }> {
    try {
      const isEmail = identifier.includes('@');
      
      const events = await prisma.securityLog.findMany({
        where: isEmail ? { email: identifier } : { userId: identifier },
      });

      const lockoutEvents = events.filter(e => e.eventType === SecurityEventType.ACCOUNT_LOCKED);
      const lastLockout = lockoutEvents.length > 0 ? lockoutEvents[0].createdAt : undefined;

      const stats = {
        totalEvents: events.length,
        verificationsSent: events.filter(e => e.eventType === SecurityEventType.VERIFICATION_SENT).length,
        verificationsSucceeded: events.filter(e => e.eventType === SecurityEventType.VERIFICATION_SUCCESS).length,
        verificationsFailed: events.filter(e => e.eventType === SecurityEventType.VERIFICATION_FAILED).length,
        accountLocked: await this.isAccountLocked(identifier),
        lastLockoutDate: lastLockout,
      };

      return stats;
    } catch (error) {
      console.error('Error getting security statistics:', error);
      return {
        totalEvents: 0,
        verificationsSent: 0,
        verificationsSucceeded: 0,
        verificationsFailed: 0,
        accountLocked: false,
      };
    }
  }

  /**
   * Get recent failed verification attempts for a user.
   * Returns detailed information about recent failures for security monitoring.
   * 
   * @param identifier - User identifier (email or user ID)
   * @param limit - Maximum number of attempts to return (default: 10)
   * @returns Promise resolving to array of failed attempt details
   * 
   * Requirements: 7.1 - Record failed attempts with timestamp and IP address
   */
  async getRecentFailedAttempts(
    identifier: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const isEmail = identifier.includes('@');
      
      const failedAttempts = await prisma.securityLog.findMany({
        where: {
          ...(isEmail ? { email: identifier } : { userId: identifier }),
          eventType: SecurityEventType.VERIFICATION_FAILED,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      return failedAttempts;
    } catch (error) {
      console.error('Error getting recent failed attempts:', error);
      return [];
    }
  }
}

// Export singleton instance
const securityService = new SecurityService();
export default securityService;
