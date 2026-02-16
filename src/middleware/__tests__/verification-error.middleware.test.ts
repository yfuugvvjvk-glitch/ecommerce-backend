/**
 * Unit tests for verification error handling middleware
 * Tests error handling for Fastify routes
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import {
  verificationErrorHandler,
  withVerificationErrorHandling,
} from '../verification-error.middleware';
import {
  VerificationError,
  VerificationErrorCode,
} from '../../utils/verification-errors';

// Mock Fastify request and reply
const createMockRequest = (): Partial<FastifyRequest> => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    child: jest.fn(),
  } as any,
  url: '/api/test',
  method: 'POST',
  body: { test: 'data' },
  headers: {},
});

const createMockReply = (): Partial<FastifyReply> => {
  const reply: any = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return reply;
};

describe('Verification Error Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockReply = createMockReply();
    jest.clearAllMocks();
  });

  describe('verificationErrorHandler', () => {
    it('should handle VerificationError with correct status code and response', async () => {
      const error = new VerificationError(VerificationErrorCode.CODE_EXPIRED);

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('expirat'),
        code: VerificationErrorCode.CODE_EXPIRED,
        details: undefined,
      });
    });

    it('should handle VerificationError with details', async () => {
      const error = new VerificationError(
        VerificationErrorCode.INCORRECT_CODE,
        400,
        { remainingAttempts: 2 }
      );

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('2 încercări'),
        code: VerificationErrorCode.INCORRECT_CODE,
        details: {
          remainingAttempts: 2,
          waitTimeMinutes: undefined,
          expiresAt: undefined,
        },
      });
    });

    it('should handle rate limit error with 429 status', async () => {
      const error = new VerificationError(
        VerificationErrorCode.RATE_LIMIT_EXCEEDED,
        429,
        { waitTimeMinutes: 45 }
      );

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('45 minute'),
        code: VerificationErrorCode.RATE_LIMIT_EXCEEDED,
        details: {
          remainingAttempts: undefined,
          waitTimeMinutes: 45,
          expiresAt: undefined,
        },
      });
    });

    it('should handle account locked error with 423 status', async () => {
      const error = new VerificationError(
        VerificationErrorCode.ACCOUNT_LOCKED,
        423
      );

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(423);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('blocat'),
        code: VerificationErrorCode.ACCOUNT_LOCKED,
        details: undefined,
      });
    });

    it('should handle Fastify validation errors', async () => {
      const error: any = {
        name: 'ValidationError',
        message: 'Validation failed',
        validation: [{ message: 'Invalid input' }],
      };

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('6 cifre'),
        code: VerificationErrorCode.INVALID_CODE_FORMAT,
        details: undefined,
      });
    });

    it('should handle generic errors with 500 status in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal error');

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'A apărut o eroare neașteptată.',
        code: 'INTERNAL_ERROR',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should expose error message in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Detailed error message');

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Detailed error message',
        code: 'INTERNAL_ERROR',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should log error details', async () => {
      const error = new VerificationError(VerificationErrorCode.CODE_NOT_FOUND);

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith({
        error: error.message,
        stack: error.stack,
        url: mockRequest.url,
        method: mockRequest.method,
        body: mockRequest.body,
      });
    });

    it('should use custom status code from error', async () => {
      const error: any = {
        name: 'CustomError',
        message: 'Custom error',
        statusCode: 418, // I'm a teapot
      };

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(418);
    });
  });

  describe('withVerificationErrorHandling', () => {
    it('should call handler and return result on success', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true });
      const wrappedHandler = withVerificationErrorHandling(handler);

      await wrappedHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(handler).toHaveBeenCalledWith(mockRequest, mockReply);
    });

    it('should catch and handle VerificationError', async () => {
      const error = new VerificationError(VerificationErrorCode.CODE_EXPIRED);
      const handler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = withVerificationErrorHandling(handler);

      await wrappedHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(handler).toHaveBeenCalledWith(mockRequest, mockReply);
      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('expirat'),
        code: VerificationErrorCode.CODE_EXPIRED,
        details: undefined,
      });
    });

    it('should catch and handle generic errors', async () => {
      const error = new Error('Something went wrong');
      const handler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = withVerificationErrorHandling(handler);

      await wrappedHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(handler).toHaveBeenCalledWith(mockRequest, mockReply);
      expect(mockReply.code).toHaveBeenCalledWith(500);
    });

    it('should preserve error details when wrapping', async () => {
      const error = new VerificationError(
        VerificationErrorCode.INCORRECT_CODE,
        400,
        { remainingAttempts: 1, waitTimeMinutes: 15 }
      );
      const handler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = withVerificationErrorHandling(handler);

      await wrappedHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('1 încercări'),
        code: VerificationErrorCode.INCORRECT_CODE,
        details: {
          remainingAttempts: 1,
          waitTimeMinutes: 15,
          expiresAt: undefined,
        },
      });
    });
  });

  describe('Error response format', () => {
    it('should always include success: false for errors', async () => {
      const error = new VerificationError(VerificationErrorCode.CODE_NOT_FOUND);

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sentData = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sentData.success).toBe(false);
    });

    it('should always include error message in Romanian', async () => {
      const error = new VerificationError(VerificationErrorCode.INVALID_EMAIL);

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sentData = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sentData.error).toBeTruthy();
      expect(typeof sentData.error).toBe('string');
    });

    it('should always include error code', async () => {
      const error = new VerificationError(VerificationErrorCode.USER_NOT_FOUND);

      await verificationErrorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sentData = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sentData.code).toBe(VerificationErrorCode.USER_NOT_FOUND);
    });
  });
});
