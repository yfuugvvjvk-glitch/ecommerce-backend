import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Rate Limit Service
 * 
 * Enforces rate limiting to prevent abuse of the verification system.
 * Tracks code generation requests and limits users to 5 codes per hour.
 * 
 * Requirements: 6.1, 6.2, 6.4
 */

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime?: Date;
  waitTimeMinutes?: number;
}

export class RateLimitService {
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_HOURS = 1;

  /**
   * Check if a user can request verification codes (5 per hour limit).
   * 
   * @param identifier - User identifier (email or user ID)
   * @returns Promise resolving to rate limit result
   * 
   * Requirement 6.1: Track the number of requests per user
   * Requirement 6.2: Reject requests exceeding 5 codes within 1 hour
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    try {
      // Find existing rate limit record
      const rateLimitRecord = await prisma.rateLimitAttempt.findUnique({
        where: { identifier },
      });

      // If no record exists, user can proceed
      if (!rateLimitRecord) {
        return {
          allowed: true,
          remainingAttempts: this.MAX_ATTEMPTS - 1, // Will be 4 after first attempt
        };
      }

      // Check if the rate limit window has expired
      const now = new Date();
      if (now > rateLimitRecord.expiresAt) {
        // Window expired, user can proceed (will be reset on recordAttempt)
        return {
          allowed: true,
          remainingAttempts: this.MAX_ATTEMPTS - 1,
        };
      }

      // Check if user has exceeded the limit
      if (rateLimitRecord.attempts >= this.MAX_ATTEMPTS) {
        const waitTimeMs = rateLimitRecord.expiresAt.getTime() - now.getTime();
        const waitTimeMinutes = Math.ceil(waitTimeMs / (1000 * 60));

        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: rateLimitRecord.expiresAt,
          waitTimeMinutes,
        };
      }

      // User has not exceeded the limit
      return {
        allowed: true,
        remainingAttempts: this.MAX_ATTEMPTS - rateLimitRecord.attempts - 1,
        resetTime: rateLimitRecord.expiresAt,
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // On error, allow the request to proceed (fail open)
      return {
        allowed: true,
        remainingAttempts: this.MAX_ATTEMPTS,
      };
    }
  }

  /**
   * Record a code generation attempt for rate limiting.
   * Creates or updates the rate limit record for the identifier.
   * 
   * @param identifier - User identifier (email or user ID)
   * @returns Promise that resolves when the attempt is recorded
   * 
   * Requirement 6.1: Track the number of requests per user
   */
  async recordAttempt(identifier: string): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.WINDOW_HOURS * 60 * 60 * 1000);

      // Try to find existing record
      const existingRecord = await prisma.rateLimitAttempt.findUnique({
        where: { identifier },
      });

      if (!existingRecord) {
        // Create new record
        await prisma.rateLimitAttempt.create({
          data: {
            id: crypto.randomUUID(),
            identifier,
            attempts: 1,
            windowStart: now,
            expiresAt,
          },
        });
      } else {
        // Check if window has expired
        if (now > existingRecord.expiresAt) {
          // Reset the window
          await prisma.rateLimitAttempt.update({
            where: { identifier },
            data: {
              attempts: 1,
              windowStart: now,
              expiresAt,
            },
          });
        } else {
          // Increment attempts within the current window
          await prisma.rateLimitAttempt.update({
            where: { identifier },
            data: {
              attempts: existingRecord.attempts + 1,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error recording rate limit attempt:', error);
      // Don't throw - rate limiting is not critical enough to block the operation
    }
  }

  /**
   * Get the remaining wait time in minutes before a user can request codes again.
   * 
   * @param identifier - User identifier (email or user ID)
   * @returns Promise resolving to wait time in minutes (0 if no wait required)
   * 
   * Requirement 6.3: Return error message with remaining wait time
   */
  async getRemainingWaitTime(identifier: string): Promise<number> {
    try {
      const rateLimitRecord = await prisma.rateLimitAttempt.findUnique({
        where: { identifier },
      });

      if (!rateLimitRecord) {
        return 0;
      }

      const now = new Date();

      // If window has expired, no wait time
      if (now > rateLimitRecord.expiresAt) {
        return 0;
      }

      // If user hasn't exceeded the limit, no wait time
      if (rateLimitRecord.attempts < this.MAX_ATTEMPTS) {
        return 0;
      }

      // Calculate remaining wait time
      const waitTimeMs = rateLimitRecord.expiresAt.getTime() - now.getTime();
      const waitTimeMinutes = Math.ceil(waitTimeMs / (1000 * 60));

      return Math.max(0, waitTimeMinutes);
    } catch (error) {
      console.error('Error getting remaining wait time:', error);
      return 0;
    }
  }

  /**
   * Reset the rate limit for a user (for testing or admin override).
   * 
   * @param identifier - User identifier (email or user ID)
   * @returns Promise that resolves when the limit is reset
   * 
   * Requirement 6.4: Allow rate limit reset
   */
  async resetLimit(identifier: string): Promise<void> {
    try {
      await prisma.rateLimitAttempt.delete({
        where: { identifier },
      });
    } catch (error) {
      // If record doesn't exist, that's fine
      if ((error as any).code !== 'P2025') {
        console.error('Error resetting rate limit:', error);
      }
    }
  }
}

export const rateLimitService = new RateLimitService();
