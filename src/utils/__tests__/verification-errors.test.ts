/**
 * Unit tests for verification error handling utilities
 * Tests error message formatting, response creation, and status codes
 */

import {
  ERROR_MESSAGES,
  VerificationErrorCode,
  VerificationError,
  formatErrorMessage,
  createErrorResponse,
  createSuccessResponse,
  getStatusCode,
  VERIFICATION_ERROR_STATUS_CODES,
} from '../verification-errors';

describe('Verification Error Utilities', () => {
  describe('ERROR_MESSAGES', () => {
    it('should contain all required error messages in Romanian', () => {
      // Validation errors
      expect(ERROR_MESSAGES.INVALID_CODE_FORMAT).toContain('6 cifre');
      expect(ERROR_MESSAGES.CODE_NOT_FOUND).toContain('nu a fost găsit');
      expect(ERROR_MESSAGES.CODE_EXPIRED).toContain('expirat');
      expect(ERROR_MESSAGES.CODE_ALREADY_USED).toContain('deja utilizat');
      expect(ERROR_MESSAGES.CODE_INVALIDATED).toContain('invalidat');
      expect(ERROR_MESSAGES.INCORRECT_CODE).toContain('incorect');

      // Rate limiting errors
      expect(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED).toContain('limita');
      expect(ERROR_MESSAGES.ACCOUNT_LOCKED).toContain('blocat');

      // Email errors
      expect(ERROR_MESSAGES.EMAIL_SEND_FAILED).toContain('email');
      expect(ERROR_MESSAGES.INVALID_EMAIL).toContain('email');
      expect(ERROR_MESSAGES.EMAIL_SERVICE_UNAVAILABLE).toContain('email');

      // Authentication errors
      expect(ERROR_MESSAGES.USER_NOT_FOUND).toContain('Utilizatorul');
      expect(ERROR_MESSAGES.INVALID_TOKEN).toContain('Token');
      expect(ERROR_MESSAGES.UNAUTHORIZED).toContain('permisiunea');

      // Success messages
      expect(ERROR_MESSAGES.CODE_SENT).toContain('trimis');
      expect(ERROR_MESSAGES.VERIFICATION_SUCCESS).toContain('succes');
      expect(ERROR_MESSAGES.EMAIL_CHANGED).toContain('email');
      expect(ERROR_MESSAGES.PHONE_CHANGED).toContain('telefon');
      expect(ERROR_MESSAGES.PASSWORD_CHANGED).toContain('Parola');
    });

    it('should have messages with proper Romanian diacritics', () => {
      // Check for Romanian-specific characters
      const allMessages = Object.values(ERROR_MESSAGES).join(' ');
      expect(allMessages).toMatch(/[ăâîșț]/); // Romanian diacritics
    });
  });

  describe('formatErrorMessage', () => {
    it('should replace single placeholder', () => {
      const message = 'Mai aveți {attempts} încercări.';
      const result = formatErrorMessage(message, { attempts: 2 });
      expect(result).toBe('Mai aveți 2 încercări.');
    });

    it('should replace multiple placeholders', () => {
      const message = 'Așteptați {minutes} minute și {seconds} secunde.';
      const result = formatErrorMessage(message, { minutes: 5, seconds: 30 });
      expect(result).toBe('Așteptați 5 minute și 30 secunde.');
    });

    it('should handle numeric values', () => {
      const message = 'Aveți {count} coduri.';
      const result = formatErrorMessage(message, { count: 0 });
      expect(result).toBe('Aveți 0 coduri.');
    });

    it('should not modify message if no placeholders', () => {
      const message = 'Mesaj fără placeholder-e.';
      const result = formatErrorMessage(message, { unused: 'value' });
      expect(result).toBe(message);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with code and message', () => {
      const response = createErrorResponse(VerificationErrorCode.CODE_NOT_FOUND);
      
      expect(response.success).toBe(false);
      expect(response.error).toBe(ERROR_MESSAGES.CODE_NOT_FOUND);
      expect(response.code).toBe(VerificationErrorCode.CODE_NOT_FOUND);
      expect(response.details).toBeUndefined();
    });

    it('should format message with remaining attempts', () => {
      const response = createErrorResponse(
        VerificationErrorCode.INCORRECT_CODE,
        { remainingAttempts: 2 }
      );
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('2 încercări');
      expect(response.code).toBe(VerificationErrorCode.INCORRECT_CODE);
      expect(response.details?.remainingAttempts).toBe(2);
    });

    it('should format message with wait time', () => {
      const response = createErrorResponse(
        VerificationErrorCode.RATE_LIMIT_EXCEEDED,
        { waitTimeMinutes: 45 }
      );
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('45 minute');
      expect(response.code).toBe(VerificationErrorCode.RATE_LIMIT_EXCEEDED);
      expect(response.details?.waitTimeMinutes).toBe(45);
    });

    it('should include expiration date in details', () => {
      const expiresAt = new Date('2024-01-01T12:00:00Z');
      const response = createErrorResponse(
        VerificationErrorCode.CODE_EXPIRED,
        { expiresAt }
      );
      
      expect(response.details?.expiresAt).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should handle multiple details', () => {
      const expiresAt = new Date('2024-01-01T12:00:00Z');
      const response = createErrorResponse(
        VerificationErrorCode.INCORRECT_CODE,
        {
          remainingAttempts: 1,
          waitTimeMinutes: 30,
          expiresAt,
        }
      );
      
      expect(response.details?.remainingAttempts).toBe(1);
      expect(response.details?.waitTimeMinutes).toBe(30);
      expect(response.details?.expiresAt).toBe('2024-01-01T12:00:00.000Z');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with message', () => {
      const response = createSuccessResponse('CODE_SENT');
      
      expect(response.success).toBe(true);
      expect(response.message).toBe(ERROR_MESSAGES.CODE_SENT);
      expect(response.data).toBeUndefined();
    });

    it('should include data when provided', () => {
      const data = { userId: '123', email: 'test@example.com' };
      const response = createSuccessResponse('VERIFICATION_SUCCESS', data);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe(ERROR_MESSAGES.VERIFICATION_SUCCESS);
      expect(response.data).toEqual(data);
    });

    it('should work with all success message keys', () => {
      const successKeys = [
        'CODE_SENT',
        'VERIFICATION_SUCCESS',
        'EMAIL_CHANGED',
        'PHONE_CHANGED',
        'PASSWORD_CHANGED',
      ] as const;

      successKeys.forEach((key) => {
        const response = createSuccessResponse(key);
        expect(response.success).toBe(true);
        expect(response.message).toBe(ERROR_MESSAGES[key]);
      });
    });
  });

  describe('VerificationError', () => {
    it('should create error with code and default status', () => {
      const error = new VerificationError(VerificationErrorCode.CODE_EXPIRED);
      
      expect(error.name).toBe('VerificationError');
      expect(error.code).toBe(VerificationErrorCode.CODE_EXPIRED);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(ERROR_MESSAGES.CODE_EXPIRED);
    });

    it('should create error with custom status code', () => {
      const error = new VerificationError(
        VerificationErrorCode.ACCOUNT_LOCKED,
        423
      );
      
      expect(error.statusCode).toBe(423);
    });

    it('should include details when provided', () => {
      const details = { remainingAttempts: 2, waitTimeMinutes: 30 };
      const error = new VerificationError(
        VerificationErrorCode.INCORRECT_CODE,
        400,
        details
      );
      
      expect(error.details).toEqual(details);
    });

    it('should be instanceof Error', () => {
      const error = new VerificationError(VerificationErrorCode.CODE_NOT_FOUND);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('getStatusCode', () => {
    it('should return correct status codes for validation errors', () => {
      expect(getStatusCode(VerificationErrorCode.INVALID_CODE_FORMAT)).toBe(400);
      expect(getStatusCode(VerificationErrorCode.CODE_NOT_FOUND)).toBe(404);
      expect(getStatusCode(VerificationErrorCode.CODE_EXPIRED)).toBe(400);
      expect(getStatusCode(VerificationErrorCode.CODE_ALREADY_USED)).toBe(400);
      expect(getStatusCode(VerificationErrorCode.CODE_INVALIDATED)).toBe(400);
      expect(getStatusCode(VerificationErrorCode.INCORRECT_CODE)).toBe(400);
    });

    it('should return correct status codes for rate limiting errors', () => {
      expect(getStatusCode(VerificationErrorCode.RATE_LIMIT_EXCEEDED)).toBe(429);
      expect(getStatusCode(VerificationErrorCode.ACCOUNT_LOCKED)).toBe(423);
    });

    it('should return correct status codes for email errors', () => {
      expect(getStatusCode(VerificationErrorCode.EMAIL_SEND_FAILED)).toBe(500);
      expect(getStatusCode(VerificationErrorCode.INVALID_EMAIL)).toBe(400);
      expect(getStatusCode(VerificationErrorCode.EMAIL_SERVICE_UNAVAILABLE)).toBe(503);
    });

    it('should return correct status codes for authentication errors', () => {
      expect(getStatusCode(VerificationErrorCode.USER_NOT_FOUND)).toBe(404);
      expect(getStatusCode(VerificationErrorCode.INVALID_TOKEN)).toBe(401);
      expect(getStatusCode(VerificationErrorCode.UNAUTHORIZED)).toBe(403);
    });
  });

  describe('VERIFICATION_ERROR_STATUS_CODES', () => {
    it('should have status code for every error code', () => {
      const errorCodes = Object.values(VerificationErrorCode);
      const statusCodes = Object.keys(VERIFICATION_ERROR_STATUS_CODES);
      
      expect(statusCodes.length).toBe(errorCodes.length);
      
      errorCodes.forEach((code) => {
        expect(VERIFICATION_ERROR_STATUS_CODES[code]).toBeDefined();
        expect(typeof VERIFICATION_ERROR_STATUS_CODES[code]).toBe('number');
      });
    });

    it('should use appropriate HTTP status codes', () => {
      const statusCodes = Object.values(VERIFICATION_ERROR_STATUS_CODES);
      
      // All status codes should be valid HTTP codes
      statusCodes.forEach((code) => {
        expect(code).toBeGreaterThanOrEqual(400);
        expect(code).toBeLessThan(600);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty details object', () => {
      const response = createErrorResponse(
        VerificationErrorCode.CODE_NOT_FOUND,
        {}
      );
      
      expect(response.details).toEqual({
        remainingAttempts: undefined,
        waitTimeMinutes: undefined,
        expiresAt: undefined,
      });
    });

    it('should handle zero remaining attempts', () => {
      const response = createErrorResponse(
        VerificationErrorCode.INCORRECT_CODE,
        { remainingAttempts: 0 }
      );
      
      expect(response.error).toContain('0 încercări');
      expect(response.details?.remainingAttempts).toBe(0);
    });

    it('should handle zero wait time', () => {
      const response = createErrorResponse(
        VerificationErrorCode.RATE_LIMIT_EXCEEDED,
        { waitTimeMinutes: 0 }
      );
      
      expect(response.error).toContain('0 minute');
      expect(response.details?.waitTimeMinutes).toBe(0);
    });
  });
});
