/**
 * Error handling middleware for verification API routes
 * Handles VerificationError instances and formats responses in Romanian
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7, 10.8
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import {
  VerificationError,
  createErrorResponse,
  getStatusCode,
  VerificationErrorCode,
} from '../utils/verification-errors';

/**
 * Fastify error handler for verification errors
 * Catches VerificationError instances and formats them with Romanian messages
 * 
 * @param error - The error that occurred
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 */
export async function verificationErrorHandler(
  error: Error | FastifyError | VerificationError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log the error for debugging
  request.log.error({
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    body: request.body,
  });

  // Handle VerificationError instances
  if (error instanceof VerificationError) {
    const statusCode = error.statusCode || getStatusCode(error.code);
    const errorResponse = createErrorResponse(error.code, error.details);

    return reply.code(statusCode).send(errorResponse);
  }

  // Handle Fastify validation errors
  if ((error as FastifyError).validation) {
    const errorResponse = createErrorResponse(
      VerificationErrorCode.INVALID_CODE_FORMAT
    );
    return reply.code(400).send(errorResponse);
  }

  // Handle generic errors (fallback)
  const statusCode = (error as any).statusCode || 500;
  
  // Don't expose internal error details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'A apărut o eroare neașteptată.' // "An unexpected error occurred" in Romanian
      : error.message;

  return reply.code(statusCode).send({
    success: false,
    error: message,
    code: 'INTERNAL_ERROR',
  });
}

/**
 * Middleware to wrap route handlers and catch verification errors
 * Use this to wrap verification-related route handlers
 * 
 * @param handler - The route handler function
 * @returns Wrapped handler with error handling
 */
export function withVerificationErrorHandling<T = any>(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await handler(request, reply);
    } catch (error) {
      await verificationErrorHandler(
        error as Error,
        request,
        reply
      );
    }
  };
}
