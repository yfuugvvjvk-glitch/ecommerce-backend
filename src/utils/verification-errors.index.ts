/**
 * Barrel export for verification error handling utilities
 * Provides convenient imports for all error handling functionality
 */

export {
  // Constants
  ERROR_MESSAGES,
  VERIFICATION_ERROR_STATUS_CODES,
  
  // Enums
  VerificationErrorCode,
  
  // Types
  VerificationErrorResponse,
  VerificationSuccessResponse,
  
  // Classes
  VerificationError,
  
  // Functions
  formatErrorMessage,
  createErrorResponse,
  createSuccessResponse,
  getStatusCode,
} from './verification-errors';

export {
  // Middleware
  verificationErrorHandler,
  withVerificationErrorHandling,
} from '../middleware/verification-error.middleware';
