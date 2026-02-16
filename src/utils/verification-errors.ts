/**
 * Error handling utilities for email verification and notification system
 * All error messages are in Romanian as per requirements 10.1-10.8
 */

/**
 * Error messages in Romanian for the verification system
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7, 10.8
 */
export const ERROR_MESSAGES = {
  // Validation errors
  INVALID_CODE_FORMAT: 'Codul de verificare trebuie să conțină exact 6 cifre.',
  CODE_NOT_FOUND: 'Codul de verificare nu a fost găsit.',
  CODE_EXPIRED:
    'Codul de verificare a expirat. Vă rugăm să solicitați un cod nou.',
  CODE_ALREADY_USED: 'Acest cod de verificare a fost deja utilizat.',
  CODE_INVALIDATED:
    'Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.',
  INCORRECT_CODE:
    'Codul de verificare este incorect. Mai aveți {attempts} încercări.',

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED:
    'Ați depășit limita de solicitări. Vă rugăm să așteptați {minutes} minute.',
  ACCOUNT_LOCKED:
    'Contul dvs. a fost blocat temporar din cauza prea multor încercări eșuate. Vă rugăm să așteptați 1 oră.',

  // Email errors
  EMAIL_SEND_FAILED:
    'Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.',
  INVALID_EMAIL: 'Adresa de email nu este validă.',
  EMAIL_SERVICE_UNAVAILABLE:
    'Serviciul de email este temporar indisponibil. Vă rugăm să încercați mai târziu.',

  // Authentication errors
  USER_NOT_FOUND: 'Utilizatorul nu a fost găsit.',
  INVALID_TOKEN: 'Token-ul de autentificare este invalid.',
  UNAUTHORIZED: 'Nu aveți permisiunea de a efectua această acțiune.',

  // Success messages
  CODE_SENT: 'Codul de verificare a fost trimis la adresa de email.',
  VERIFICATION_SUCCESS: 'Verificarea a fost realizată cu succes.',
  EMAIL_CHANGED: 'Adresa de email a fost schimbată cu succes.',
  PHONE_CHANGED: 'Numărul de telefon a fost schimbat cu succes.',
  PASSWORD_CHANGED:
    'Parola a fost schimbată cu succes. Un email de confirmare a fost trimis.',
} as const;

/**
 * Error codes for programmatic error handling
 */
export enum VerificationErrorCode {
  // Validation errors
  INVALID_CODE_FORMAT = 'INVALID_CODE_FORMAT',
  CODE_NOT_FOUND = 'CODE_NOT_FOUND',
  CODE_EXPIRED = 'CODE_EXPIRED',
  CODE_ALREADY_USED = 'CODE_ALREADY_USED',
  CODE_INVALIDATED = 'CODE_INVALIDATED',
  INCORRECT_CODE = 'INCORRECT_CODE',

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

  // Email errors
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  INVALID_EMAIL = 'INVALID_EMAIL',
  EMAIL_SERVICE_UNAVAILABLE = 'EMAIL_SERVICE_UNAVAILABLE',

  // Authentication errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_TOKEN = 'INVALID_TOKEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

/**
 * Interface for error response structure
 */
export interface VerificationErrorResponse {
  success: false;
  error: string; // Romanian error message
  code: VerificationErrorCode; // Error code for client handling
  details?: {
    remainingAttempts?: number;
    waitTimeMinutes?: number;
    expiresAt?: string;
  };
}

/**
 * Interface for success response structure
 */
export interface VerificationSuccessResponse {
  success: true;
  message: string; // Romanian success message
  data?: any;
}

/**
 * Custom error class for verification errors
 */
export class VerificationError extends Error {
  constructor(
    public code: VerificationErrorCode,
    public statusCode: number = 400,
    public details?: {
      remainingAttempts?: number;
      waitTimeMinutes?: number;
      expiresAt?: Date;
    }
  ) {
    super(ERROR_MESSAGES[code] || 'An error occurred');
    this.name = 'VerificationError';
  }
}

/**
 * Format error message with dynamic values
 * @param message - Message template with placeholders
 * @param values - Values to replace in the template
 * @returns Formatted message
 */
export function formatErrorMessage(
  message: string,
  values: Record<string, string | number>
): string {
  let formatted = message;
  for (const [key, value] of Object.entries(values)) {
    formatted = formatted.replace(`{${key}}`, String(value));
  }
  return formatted;
}

/**
 * Create error response with Romanian message
 * Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.8
 * @param code - Error code
 * @param details - Optional error details
 * @returns Formatted error response
 */
export function createErrorResponse(
  code: VerificationErrorCode,
  details?: {
    remainingAttempts?: number;
    waitTimeMinutes?: number;
    expiresAt?: Date;
  }
): VerificationErrorResponse {
  let message: string = ERROR_MESSAGES[code];

  // Format message with dynamic values
  if (details?.remainingAttempts !== undefined) {
    message = formatErrorMessage(message, {
      attempts: details.remainingAttempts,
    });
  }

  if (details?.waitTimeMinutes !== undefined) {
    message = formatErrorMessage(message, {
      minutes: details.waitTimeMinutes,
    });
  }

  return {
    success: false,
    error: message,
    code,
    details: details
      ? {
          remainingAttempts: details.remainingAttempts,
          waitTimeMinutes: details.waitTimeMinutes,
          expiresAt: details.expiresAt?.toISOString(),
        }
      : undefined,
  };
}

/**
 * Create success response with Romanian message
 * Requirements: 10.1, 10.7
 * @param messageKey - Key from ERROR_MESSAGES for success message
 * @param data - Optional response data
 * @returns Formatted success response
 */
export function createSuccessResponse(
  messageKey: keyof typeof ERROR_MESSAGES,
  data?: any
): VerificationSuccessResponse {
  return {
    success: true,
    message: ERROR_MESSAGES[messageKey],
    data,
  };
}

/**
 * HTTP status codes for verification errors
 */
export const VERIFICATION_ERROR_STATUS_CODES: Record<
  VerificationErrorCode,
  number
> = {
  // Validation errors - 400 Bad Request
  [VerificationErrorCode.INVALID_CODE_FORMAT]: 400,
  [VerificationErrorCode.CODE_NOT_FOUND]: 404,
  [VerificationErrorCode.CODE_EXPIRED]: 400,
  [VerificationErrorCode.CODE_ALREADY_USED]: 400,
  [VerificationErrorCode.CODE_INVALIDATED]: 400,
  [VerificationErrorCode.INCORRECT_CODE]: 400,

  // Rate limiting errors - 429 Too Many Requests
  [VerificationErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [VerificationErrorCode.ACCOUNT_LOCKED]: 423, // 423 Locked

  // Email errors - 500 Internal Server Error / 400 Bad Request
  [VerificationErrorCode.EMAIL_SEND_FAILED]: 500,
  [VerificationErrorCode.INVALID_EMAIL]: 400,
  [VerificationErrorCode.EMAIL_SERVICE_UNAVAILABLE]: 503, // 503 Service Unavailable

  // Authentication errors - 401 Unauthorized / 404 Not Found
  [VerificationErrorCode.USER_NOT_FOUND]: 404,
  [VerificationErrorCode.INVALID_TOKEN]: 401,
  [VerificationErrorCode.UNAUTHORIZED]: 403, // 403 Forbidden
};

/**
 * Get HTTP status code for verification error
 * @param code - Error code
 * @returns HTTP status code
 */
export function getStatusCode(code: VerificationErrorCode): number {
  return VERIFICATION_ERROR_STATUS_CODES[code] || 500;
}
