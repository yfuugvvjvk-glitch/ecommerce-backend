# Verification Error Handling Guide

This guide explains how to use the error handling utilities for the email verification and notification system. All error messages are in Romanian as per requirements 10.1-10.8.

## Overview

The verification error handling system provides:

- **Romanian error messages** for all verification-related errors
- **Consistent error response format** across all API endpoints
- **Proper HTTP status codes** for different error types
- **Error handling middleware** for Fastify routes
- **Type-safe error handling** with TypeScript

## Files

- `verification-errors.ts` - Error constants, types, and utilities
- `verification-error.middleware.ts` - Fastify error handling middleware
- `__tests__/verification-errors.test.ts` - Unit tests for error utilities
- `../middleware/__tests__/verification-error.middleware.test.ts` - Middleware tests

## Error Messages

All error messages are defined in the `ERROR_MESSAGES` constant in Romanian:

```typescript
import { ERROR_MESSAGES } from './utils/verification-errors';

console.log(ERROR_MESSAGES.CODE_EXPIRED);
// Output: "Codul de verificare a expirat. Vă rugăm să solicitați un cod nou."
```

### Available Error Messages

**Validation Errors:**

- `INVALID_CODE_FORMAT` - Code must be exactly 6 digits
- `CODE_NOT_FOUND` - Verification code not found
- `CODE_EXPIRED` - Code has expired (15 minutes)
- `CODE_ALREADY_USED` - Code has already been used
- `CODE_INVALIDATED` - Code invalidated due to too many attempts
- `INCORRECT_CODE` - Code is incorrect (with remaining attempts)

**Rate Limiting Errors:**

- `RATE_LIMIT_EXCEEDED` - Too many requests (5 per hour)
- `ACCOUNT_LOCKED` - Account locked due to failed attempts (10 in 1 hour)

**Email Errors:**

- `EMAIL_SEND_FAILED` - Failed to send email
- `INVALID_EMAIL` - Invalid email address
- `EMAIL_SERVICE_UNAVAILABLE` - Email service temporarily unavailable

**Authentication Errors:**

- `USER_NOT_FOUND` - User not found
- `INVALID_TOKEN` - Invalid authentication token
- `UNAUTHORIZED` - No permission to perform action

**Success Messages:**

- `CODE_SENT` - Verification code sent successfully
- `VERIFICATION_SUCCESS` - Verification successful
- `EMAIL_CHANGED` - Email changed successfully
- `PHONE_CHANGED` - Phone number changed successfully
- `PASSWORD_CHANGED` - Password changed successfully

## Error Codes

Use `VerificationErrorCode` enum for type-safe error handling:

```typescript
import { VerificationErrorCode } from './utils/verification-errors';

if (code.attempts >= 3) {
  throw new VerificationError(VerificationErrorCode.CODE_INVALIDATED);
}
```

## Creating Errors

### Basic Error

```typescript
import {
  VerificationError,
  VerificationErrorCode,
} from './utils/verification-errors';

// Throw a simple error
throw new VerificationError(VerificationErrorCode.CODE_EXPIRED);
```

### Error with Details

```typescript
// Error with remaining attempts
throw new VerificationError(VerificationErrorCode.INCORRECT_CODE, 400, {
  remainingAttempts: 2,
});

// Error with wait time
throw new VerificationError(VerificationErrorCode.RATE_LIMIT_EXCEEDED, 429, {
  waitTimeMinutes: 45,
});

// Error with expiration date
throw new VerificationError(VerificationErrorCode.CODE_EXPIRED, 400, {
  expiresAt: new Date(),
});
```

## Creating Responses

### Error Response

```typescript
import {
  createErrorResponse,
  VerificationErrorCode,
} from './utils/verification-errors';

// Simple error response
const response = createErrorResponse(VerificationErrorCode.CODE_NOT_FOUND);
// Returns:
// {
//   success: false,
//   error: "Codul de verificare nu a fost găsit.",
//   code: "CODE_NOT_FOUND"
// }

// Error response with details
const response = createErrorResponse(VerificationErrorCode.INCORRECT_CODE, {
  remainingAttempts: 2,
});
// Returns:
// {
//   success: false,
//   error: "Codul de verificare este incorect. Mai aveți 2 încercări.",
//   code: "INCORRECT_CODE",
//   details: {
//     remainingAttempts: 2,
//     waitTimeMinutes: undefined,
//     expiresAt: undefined
//   }
// }
```

### Success Response

```typescript
import { createSuccessResponse } from './utils/verification-errors';

// Simple success response
const response = createSuccessResponse('CODE_SENT');
// Returns:
// {
//   success: true,
//   message: "Codul de verificare a fost trimis la adresa de email."
// }

// Success response with data
const response = createSuccessResponse('VERIFICATION_SUCCESS', {
  userId: '123',
  email: 'user@example.com',
});
// Returns:
// {
//   success: true,
//   message: "Verificarea a fost realizată cu succes.",
//   data: { userId: '123', email: 'user@example.com' }
// }
```

## Using in Routes

### Method 1: Using withVerificationErrorHandling Wrapper

```typescript
import { FastifyInstance } from 'fastify';
import { withVerificationErrorHandling } from '../middleware/verification-error.middleware';
import {
  VerificationError,
  VerificationErrorCode,
} from '../utils/verification-errors';

export default async function routes(fastify: FastifyInstance) {
  fastify.post(
    '/api/auth/verify-email',
    withVerificationErrorHandling(async (request, reply) => {
      const { email, code } = request.body as any;

      // Your verification logic here
      const result = await verificationService.verifyEmailCode(email, code);

      if (!result.success) {
        // Throw VerificationError - middleware will handle it
        throw new VerificationError(VerificationErrorCode.INCORRECT_CODE, 400, {
          remainingAttempts: result.remainingAttempts,
        });
      }

      // Return success response
      return reply.send({
        success: true,
        message: 'Verificarea a fost realizată cu succes.',
        data: result.data,
      });
    })
  );
}
```

### Method 2: Using Try-Catch with Error Handler

```typescript
import { verificationErrorHandler } from '../middleware/verification-error.middleware';

fastify.post('/api/auth/verify-email', async (request, reply) => {
  try {
    const { email, code } = request.body as any;

    const result = await verificationService.verifyEmailCode(email, code);

    if (!result.success) {
      throw new VerificationError(VerificationErrorCode.INCORRECT_CODE, 400, {
        remainingAttempts: result.remainingAttempts,
      });
    }

    return reply.send({
      success: true,
      message: 'Verificarea a fost realizată cu succes.',
      data: result.data,
    });
  } catch (error) {
    return verificationErrorHandler(error as Error, request, reply);
  }
});
```

### Method 3: Using createErrorResponse Directly

```typescript
import {
  createErrorResponse,
  VerificationErrorCode,
} from '../utils/verification-errors';

fastify.post('/api/auth/verify-email', async (request, reply) => {
  const { email, code } = request.body as any;

  const result = await verificationService.verifyEmailCode(email, code);

  if (!result.success) {
    const errorResponse = createErrorResponse(
      VerificationErrorCode.INCORRECT_CODE,
      { remainingAttempts: result.remainingAttempts }
    );

    return reply.code(400).send(errorResponse);
  }

  return reply.send({
    success: true,
    message: 'Verificarea a fost realizată cu succes.',
    data: result.data,
  });
});
```

## Service Layer Usage

In your service methods, throw `VerificationError` instances:

```typescript
import {
  VerificationError,
  VerificationErrorCode,
} from '../utils/verification-errors';

class VerificationService {
  async verifyEmailCode(email: string, code: string) {
    const storedCode = await this.getVerificationCode(email);

    if (!storedCode) {
      throw new VerificationError(VerificationErrorCode.CODE_NOT_FOUND);
    }

    if (this.isCodeExpired(storedCode.expiresAt)) {
      throw new VerificationError(VerificationErrorCode.CODE_EXPIRED);
    }

    if (storedCode.attempts >= 3) {
      throw new VerificationError(VerificationErrorCode.CODE_INVALIDATED);
    }

    const isValid = await this.verifyCodeHash(code, storedCode.codeHash);

    if (!isValid) {
      const remainingAttempts = 3 - (storedCode.attempts + 1);
      throw new VerificationError(VerificationErrorCode.INCORRECT_CODE, 400, {
        remainingAttempts,
      });
    }

    // Success - create user account
    const user = await this.createUserFromPending(email);
    return { success: true, user };
  }
}
```

## HTTP Status Codes

The system automatically maps error codes to appropriate HTTP status codes:

| Error Code                | HTTP Status | Description           |
| ------------------------- | ----------- | --------------------- |
| INVALID_CODE_FORMAT       | 400         | Bad Request           |
| CODE_NOT_FOUND            | 404         | Not Found             |
| CODE_EXPIRED              | 400         | Bad Request           |
| CODE_ALREADY_USED         | 400         | Bad Request           |
| CODE_INVALIDATED          | 400         | Bad Request           |
| INCORRECT_CODE            | 400         | Bad Request           |
| RATE_LIMIT_EXCEEDED       | 429         | Too Many Requests     |
| ACCOUNT_LOCKED            | 423         | Locked                |
| EMAIL_SEND_FAILED         | 500         | Internal Server Error |
| INVALID_EMAIL             | 400         | Bad Request           |
| EMAIL_SERVICE_UNAVAILABLE | 503         | Service Unavailable   |
| USER_NOT_FOUND            | 404         | Not Found             |
| INVALID_TOKEN             | 401         | Unauthorized          |
| UNAUTHORIZED              | 403         | Forbidden             |

## Response Format

All responses follow a consistent format:

### Error Response

```typescript
{
  success: false,
  error: "Codul de verificare este incorect. Mai aveți 2 încercări.",
  code: "INCORRECT_CODE",
  details?: {
    remainingAttempts?: number,
    waitTimeMinutes?: number,
    expiresAt?: string // ISO 8601 format
  }
}
```

### Success Response

```typescript
{
  success: true,
  message: "Verificarea a fost realizată cu succes.",
  data?: any // Optional response data
}
```

## Testing

### Testing Error Responses

```typescript
import {
  createErrorResponse,
  VerificationErrorCode,
} from '../utils/verification-errors';

describe('Verification Route', () => {
  it('should return error for expired code', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { email: 'test@example.com', code: '123456' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      success: false,
      error: expect.stringContaining('expirat'),
      code: 'CODE_EXPIRED',
    });
  });
});
```

### Testing Success Responses

```typescript
it('should return success for valid code', async () => {
  const response = await fastify.inject({
    method: 'POST',
    url: '/api/auth/verify-email',
    payload: { email: 'test@example.com', code: '123456' },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
    success: true,
    message: expect.stringContaining('succes'),
    data: expect.any(Object),
  });
});
```

## Best Practices

1. **Always use VerificationError in services** - Don't throw generic errors
2. **Include details when available** - Provide remaining attempts, wait times, etc.
3. **Use the wrapper middleware** - Simplifies error handling in routes
4. **Log errors appropriately** - The middleware logs all errors automatically
5. **Don't expose sensitive information** - Error messages are user-friendly and safe
6. **Test error scenarios** - Write tests for all error cases
7. **Use type-safe error codes** - Use the VerificationErrorCode enum

## Requirements Coverage

This error handling system satisfies the following requirements:

- **Requirement 10.1**: Success messages in Romanian
- **Requirement 10.2**: Descriptive error messages in Romanian for send failures
- **Requirement 10.3**: Error messages for invalid codes
- **Requirement 10.4**: Error messages for expired codes
- **Requirement 10.5**: Error messages with wait time for rate limiting
- **Requirement 10.6**: Error messages for account lockout
- **Requirement 10.7**: Success messages with next steps
- **Requirement 10.8**: Error messages for maximum attempts exceeded

## Examples

See the test files for comprehensive examples:

- `__tests__/verification-errors.test.ts` - Error utility tests
- `../middleware/__tests__/verification-error.middleware.test.ts` - Middleware tests
