import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import emailService, { EmailType } from './email.service';

const prisma = new PrismaClient();

/**
 * Verification Service
 * 
 * Core functionality for email verification and notification system.
 * Handles code generation, hashing, validation, and expiration checks.
 * 
 * Requirements: 1.1, 5.1, 5.6
 */
export class VerificationService {
  private readonly CODE_LENGTH = 6;
  private readonly SALT_ROUNDS = 10;
  private readonly EXPIRATION_MINUTES = 15;

  /**
   * Generate a 6-digit random verification code using cryptographically secure random number generator.
   * 
   * @returns A 6-digit numeric string (e.g., "123456", "000042")
   * 
   * Requirement 1.1: Generate a 6-digit random verification code
   * Requirement 5.6: Use cryptographically secure random number generator
   */
  generateVerificationCode(): string {
    // Generate a random number between 0 and 999999
    const code = crypto.randomInt(0, 1000000);
    
    // Pad with leading zeros to ensure exactly 6 digits
    return code.toString().padStart(this.CODE_LENGTH, '0');
  }

  /**
   * Hash a verification code using bcrypt with 10 salt rounds.
   * 
   * @param code - The plaintext verification code to hash
   * @returns Promise resolving to the hashed code
   * 
   * Requirement 5.1: Hash the code before storing it in the database
   */
  async hashCode(code: string): Promise<string> {
    return bcrypt.hash(code, this.SALT_ROUNDS);
  }

  /**
   * Verify a code against its hash using constant-time comparison.
   * 
   * @param code - The plaintext code to verify
   * @param hash - The stored hash to compare against
   * @returns Promise resolving to true if the code matches, false otherwise
   * 
   * Requirement 5.1: Compare hashed values for validation
   * Note: bcrypt.compare uses constant-time comparison internally to prevent timing attacks
   */
  async verifyCodeHash(code: string, hash: string): Promise<boolean> {
    return bcrypt.compare(code, hash);
  }

  /**
   * Check if a verification code has expired (15 minutes from creation).
   * 
   * @param expiresAt - The expiration timestamp of the code
   * @returns true if the code has expired, false otherwise
   * 
   * Requirement 1.5: Reject codes that expire after 15 minutes
   */
  isCodeExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Send email verification code for registration.
   * Creates a PendingUser record and VerificationCode, then sends the code via email.
   * 
   * @param email - User's email address
   * @param password - Hashed password
   * @param name - User's name
   * @param phone - Optional phone number
   * @returns Promise resolving to success status and message
   * 
   * Requirements: 1.1, 1.2, 1.3
   */
  async sendEmailVerificationCode(
    email: string,
    password: string,
    name: string,
    phone?: string
  ): Promise<{ success: boolean; message: string; pendingUserId?: string }> {
    try {
      // Generate verification code
      const code = this.generateVerificationCode();
      const codeHash = await this.hashCode(code);

      // Calculate expiration time (15 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.EXPIRATION_MINUTES);

      // Create PendingUser record
      const pendingUserExpiresAt = new Date();
      pendingUserExpiresAt.setHours(pendingUserExpiresAt.getHours() + 24); // 24 hours

      const pendingUser = await prisma.pendingUser.create({
        data: {
          id: crypto.randomUUID(),
          email,
          password,
          name,
          phone,
          expiresAt: pendingUserExpiresAt,
        },
      });

      // Create VerificationCode record
      await prisma.verificationCode.create({
        data: {
          id: crypto.randomUUID(),
          email,
          type: 'EMAIL_REGISTRATION',
          codeHash,
          expiresAt,
          maxAttempts: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Send email with verification code
      const emailResult = await emailService.sendVerificationCode(
        email,
        code,
        EmailType.REGISTRATION_VERIFICATION
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // IMPORTANT: Display code in console for testing when SMTP is not configured
        console.log('\n========================================');
        console.log('📧 EMAIL VERIFICATION CODE (for testing)');
        console.log('========================================');
        console.log(`Email: ${email}`);
        console.log(`Code: ${code}`);
        console.log(`Expires in: ${this.EXPIRATION_MINUTES} minutes`);
        console.log('========================================\n');
      }

      return {
        success: true,
        message: 'Codul de verificare a fost trimis la adresa de email.',
        pendingUserId: pendingUser.id,
      };
    } catch (error) {
      console.error('Error sending verification code:', error);
      return {
        success: false,
        message: 'Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.',
      };
    }
  }

  /**
   * Verify email code and create User account.
   * Validates the code, creates the user account, and removes the pending user record.
   * 
   * @param email - User's email address
   * @param code - Verification code provided by user
   * @returns Promise resolving to success status, message, and optional user data
   * 
   * Requirements: 1.3, 1.4, 1.5, 1.8
   */
  async verifyEmailCode(
    email: string,
    code: string
  ): Promise<{ success: boolean; message: string; user?: any; remainingAttempts?: number }> {
    try {
      // Find the verification code
      const verificationCode = await prisma.verificationCode.findFirst({
        where: {
          email,
          type: 'EMAIL_REGISTRATION',
          verified: false,
          invalidated: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!verificationCode) {
        return {
          success: false,
          message: 'Codul de verificare nu a fost găsit.',
        };
      }

      // Check if code is expired
      if (this.isCodeExpired(verificationCode.expiresAt)) {
        return {
          success: false,
          message: 'Codul de verificare a expirat. Vă rugăm să solicitați un cod nou.',
        };
      }

      // Check if max attempts exceeded
      if (verificationCode.attempts >= verificationCode.maxAttempts) {
        await prisma.verificationCode.update({
          where: { id: verificationCode.id },
          data: { invalidated: true },
        });
        return {
          success: false,
          message: 'Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.',
        };
      }

      // Verify the code hash
      const isValid = await this.verifyCodeHash(code, verificationCode.codeHash);

      if (!isValid) {
        // Increment attempts
        const updatedCode = await prisma.verificationCode.update({
          where: { id: verificationCode.id },
          data: { attempts: verificationCode.attempts + 1 },
        });

        const remainingAttempts = updatedCode.maxAttempts - updatedCode.attempts;

        // If this was the last attempt, invalidate the code
        if (remainingAttempts <= 0) {
          await prisma.verificationCode.update({
            where: { id: verificationCode.id },
            data: { invalidated: true },
          });
          return {
            success: false,
            message: 'Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.',
          };
        }

        return {
          success: false,
          message: `Codul de verificare este incorect. Mai aveți ${remainingAttempts} încercări.`,
          remainingAttempts,
        };
      }

      // Code is valid - get pending user and create actual user
      const pendingUser = await prisma.pendingUser.findUnique({
        where: { email },
      });

      if (!pendingUser) {
        return {
          success: false,
          message: 'Utilizatorul nu a fost găsit.',
        };
      }

      // Create the user account
      const user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: pendingUser.email,
          password: pendingUser.password,
          name: pendingUser.name,
          phone: pendingUser.phone,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Mark verification code as verified
      await prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      });

      // Delete pending user
      await prisma.pendingUser.delete({
        where: { email },
      });

      return {
        success: true,
        message: 'Verificarea a fost realizată cu succes.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
      };
    } catch (error) {
      console.error('Error verifying email code:', error);
      return {
        success: false,
        message: 'A apărut o eroare la verificarea codului. Vă rugăm să încercați din nou.',
      };
    }
  }

  /**
   * Resend email verification code.
   * Invalidates the old code and generates a new one.
   * 
   * @param email - User's email address
   * @returns Promise resolving to success status and message
   * 
   * Requirements: 1.6
   */
  async resendEmailCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if pending user exists
      const pendingUser = await prisma.pendingUser.findUnique({
        where: { email },
      });

      if (!pendingUser) {
        return {
          success: false,
          message: 'Utilizatorul nu a fost găsit.',
        };
      }

      // Invalidate all previous codes for this email and type
      await prisma.verificationCode.updateMany({
        where: {
          email,
          type: 'EMAIL_REGISTRATION',
          verified: false,
        },
        data: {
          invalidated: true,
        },
      });

      // Generate new verification code
      const code = this.generateVerificationCode();
      const codeHash = await this.hashCode(code);

      // Calculate expiration time (15 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.EXPIRATION_MINUTES);

      // Create new VerificationCode record
      await prisma.verificationCode.create({
        data: {
          id: crypto.randomUUID(),
          email,
          type: 'EMAIL_REGISTRATION',
          codeHash,
          expiresAt,
          maxAttempts: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Send email with verification code
      const emailResult = await emailService.sendVerificationCode(
        email,
        code,
        EmailType.REGISTRATION_VERIFICATION
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // IMPORTANT: Display code in console for testing when SMTP is not configured
        console.log('\n========================================');
        console.log('📧 RESEND EMAIL VERIFICATION CODE (for testing)');
        console.log('========================================');
        console.log(`Email: ${email}`);
        console.log(`Code: ${code}`);
        console.log(`Expires in: ${this.EXPIRATION_MINUTES} minutes`);
        console.log('========================================\n');
      }

      return {
        success: true,
        message: 'Codul de verificare a fost trimis la adresa de email.',
      };
    } catch (error) {
      console.error('Error resending verification code:', error);
      return {
        success: false,
        message: 'Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.',
      };
    }
  }

  /**
   * Send email change verification code.
   * Generates a verification code and sends it to the new email address.
   * Also sends a notification to the current email address.
   *
   * @param userId - User's ID
   * @param newEmail - New email address to verify
   * @returns Promise resolving to success status and message
   *
   * Requirements: 2.2, 2.3
   */
  async sendEmailChangeCode(
    userId: string,
    newEmail: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'Utilizatorul nu a fost găsit.',
        };
      }

      // Send notification to old email
      const notificationResult = await emailService.sendEmailChangeNotification(
        user.email,
        newEmail
      );

      if (!notificationResult.success) {
        console.error('Failed to send email change notification:', notificationResult.error);
        // Continue anyway
      }

      // Generate verification code
      const code = this.generateVerificationCode();
      const codeHash = await this.hashCode(code);

      // Calculate expiration time (15 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.EXPIRATION_MINUTES);

      // Invalidate any previous email change codes for this user
      await prisma.verificationCode.updateMany({
        where: {
          userId,
          type: 'EMAIL_CHANGE',
          verified: false,
        },
        data: {
          invalidated: true,
        },
      });

      // Create VerificationCode record
      await prisma.verificationCode.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          email: newEmail, // Store the new email being verified
          type: 'EMAIL_CHANGE',
          codeHash,
          expiresAt,
          maxAttempts: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Send email with verification code to new email
      const emailResult = await emailService.sendVerificationCode(
        newEmail,
        code,
        EmailType.EMAIL_CHANGE_VERIFICATION
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // Continue anyway - code is stored in database
      }

      return {
        success: true,
        message: 'Codul de verificare a fost trimis la adresa de email.',
      };
    } catch (error) {
      console.error('Error sending email change code:', error);
      return {
        success: false,
        message: 'Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.',
      };
    }
  }

  /**
   * Verify email change code and update user email.
   * Validates the code and updates the user's email address if valid.
   *
   * @param userId - User's ID
   * @param code - Verification code provided by user
   * @returns Promise resolving to success status, message, and optional user data
   *
   * Requirements: 2.5
   */
  async verifyEmailChangeCode(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string; user?: any; remainingAttempts?: number }> {
    try {
      // Find the verification code
      const verificationCode = await prisma.verificationCode.findFirst({
        where: {
          userId,
          type: 'EMAIL_CHANGE',
          verified: false,
          invalidated: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!verificationCode) {
        return {
          success: false,
          message: 'Codul de verificare nu a fost găsit.',
        };
      }

      // Check if code is expired
      if (this.isCodeExpired(verificationCode.expiresAt)) {
        return {
          success: false,
          message: 'Codul de verificare a expirat. Vă rugăm să solicitați un cod nou.',
        };
      }

      // Check if max attempts exceeded
      if (verificationCode.attempts >= verificationCode.maxAttempts) {
        await prisma.verificationCode.update({
          where: { id: verificationCode.id },
          data: { invalidated: true },
        });
        return {
          success: false,
          message: 'Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.',
        };
      }

      // Verify the code hash
      const isValid = await this.verifyCodeHash(code, verificationCode.codeHash);

      if (!isValid) {
        // Increment attempts
        const updatedCode = await prisma.verificationCode.update({
          where: { id: verificationCode.id },
          data: { attempts: verificationCode.attempts + 1 },
        });

        const remainingAttempts = updatedCode.maxAttempts - updatedCode.attempts;

        // If this was the last attempt, invalidate the code
        if (remainingAttempts <= 0) {
          await prisma.verificationCode.update({
            where: { id: verificationCode.id },
            data: { invalidated: true },
          });
          return {
            success: false,
            message: 'Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.',
          };
        }

        return {
          success: false,
          message: `Codul de verificare este incorect. Mai aveți ${remainingAttempts} încercări.`,
          remainingAttempts,
        };
      }

      // Code is valid - update user email
      const newEmail = verificationCode.email;

      if (!newEmail) {
        return {
          success: false,
          message: 'Adresa de email nu a fost găsită.',
        };
      }

      // Update user email
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          email: newEmail,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      // Mark verification code as verified
      await prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Adresa de email a fost schimbată cu succes.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
      };
    } catch (error) {
      console.error('Error verifying email change code:', error);
      return {
        success: false,
        message: 'A apărut o eroare la verificarea codului. Vă rugăm să încercați din nou.',
      };
    }
  }


   /**
    * Send phone change verification code.
    * Generates a verification code and sends it to the user's current email address.
    *
    * @param userId - User's ID
    * @param newPhone - New phone number to verify
    * @returns Promise resolving to success status and message
    *
    * Requirements: 4.1, 4.2
    */
   async sendPhoneChangeCode(
     userId: string,
     newPhone: string
   ): Promise<{ success: boolean; message: string }> {
     try {
       // Get current user
       const user = await prisma.user.findUnique({
         where: { id: userId },
       });

       if (!user) {
         return {
           success: false,
           message: 'Utilizatorul nu a fost găsit.',
         };
       }

       // Generate verification code
       const code = this.generateVerificationCode();
       const codeHash = await this.hashCode(code);

       // Calculate expiration time (15 minutes from now)
       const expiresAt = new Date();
       expiresAt.setMinutes(expiresAt.getMinutes() + this.EXPIRATION_MINUTES);

       // Invalidate any previous phone change codes for this user
       await prisma.verificationCode.updateMany({
         where: {
           userId,
           type: 'PHONE_CHANGE',
           verified: false,
         },
         data: {
           invalidated: true,
         },
       });

       // Create VerificationCode record
       await prisma.verificationCode.create({
         data: {
           id: crypto.randomUUID(),
           userId,
           phone: newPhone, // Store the new phone being verified
           type: 'PHONE_CHANGE',
           codeHash,
           expiresAt,
           maxAttempts: 3,
           createdAt: new Date(),
           updatedAt: new Date(),
         },
       });

       // Send email with verification code to user's current email
       const emailResult = await emailService.sendVerificationCode(
         user.email,
         code,
         EmailType.PHONE_CHANGE_VERIFICATION
       );

       if (!emailResult.success) {
         console.error('Failed to send verification email:', emailResult.error);
         // Continue anyway - code is stored in database
       }

       return {
         success: true,
         message: 'Codul de verificare a fost trimis la adresa de email.',
       };
     } catch (error) {
       console.error('Error sending phone change code:', error);
       return {
         success: false,
         message: 'Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.',
       };
     }
   }

   /**
    * Verify phone change code and update user phone.
    * Validates the code and updates the user's phone number if valid.
    *
    * @param userId - User's ID
    * @param code - Verification code provided by user
    * @returns Promise resolving to success status, message, and optional user data
    *
    * Requirements: 4.4
    */
   async verifyPhoneChangeCode(
     userId: string,
     code: string
   ): Promise<{ success: boolean; message: string; user?: any; remainingAttempts?: number }> {
     try {
       // Find the verification code
       const verificationCode = await prisma.verificationCode.findFirst({
         where: {
           userId,
           type: 'PHONE_CHANGE',
           verified: false,
           invalidated: false,
         },
         orderBy: {
           createdAt: 'desc',
         },
       });

       if (!verificationCode) {
         return {
           success: false,
           message: 'Codul de verificare nu a fost găsit.',
         };
       }

       // Check if code is expired
       if (this.isCodeExpired(verificationCode.expiresAt)) {
         return {
           success: false,
           message: 'Codul de verificare a expirat. Vă rugăm să solicitați un cod nou.',
         };
       }

       // Check if max attempts exceeded
       if (verificationCode.attempts >= verificationCode.maxAttempts) {
         await prisma.verificationCode.update({
           where: { id: verificationCode.id },
           data: { invalidated: true },
         });
         return {
           success: false,
           message: 'Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.',
         };
       }

       // Verify the code hash
       const isValid = await this.verifyCodeHash(code, verificationCode.codeHash);

       if (!isValid) {
         // Increment attempts
         const updatedCode = await prisma.verificationCode.update({
           where: { id: verificationCode.id },
           data: { attempts: verificationCode.attempts + 1 },
         });

         const remainingAttempts = updatedCode.maxAttempts - updatedCode.attempts;

         // If this was the last attempt, invalidate the code
         if (remainingAttempts <= 0) {
           await prisma.verificationCode.update({
             where: { id: verificationCode.id },
             data: { invalidated: true },
           });
           return {
             success: false,
             message: 'Codul de verificare a fost invalidat din cauza prea multor încercări eșuate.',
           };
         }

         return {
           success: false,
           message: `Codul de verificare este incorect. Mai aveți ${remainingAttempts} încercări.`,
           remainingAttempts,
         };
       }

       // Code is valid - update user phone
       const newPhone = verificationCode.phone;

       if (!newPhone) {
         return {
           success: false,
           message: 'Numărul de telefon nu a fost găsit.',
         };
       }

       // Update user phone
       const user = await prisma.user.update({
         where: { id: userId },
         data: {
           phone: newPhone,
         },
       });

       // Mark verification code as verified
       await prisma.verificationCode.update({
         where: { id: verificationCode.id },
         data: {
           verified: true,
           verifiedAt: new Date(),
         },
       });

       return {
         success: true,
         message: 'Numărul de telefon a fost schimbat cu succes.',
         user: {
           id: user.id,
           email: user.email,
           name: user.name,
           phone: user.phone,
         },
       };
     } catch (error) {
       console.error('Error verifying phone change code:', error);
       return {
         success: false,
         message: 'A apărut o eroare la verificarea codului. Vă rugăm să încercați din nou.',
       };
     }
   }

  /**
   * Query verification codes by user identifier and type.
   * Returns all verification codes matching the criteria, including expired ones for audit purposes.
   * 
   * @param identifier - User identifier (email or user ID)
   * @param type - Verification type (EMAIL_REGISTRATION, EMAIL_CHANGE, PHONE_CHANGE)
   * @returns Promise resolving to array of verification codes
   * 
   * Requirements: 9.2 - Support querying verification codes by user identifier and verification type
   */
  async getCodesByIdentifierAndType(
    identifier: string,
    type: string
  ): Promise<any[]> {
    try {
      // Query by email or userId depending on the identifier format
      const isEmail = identifier.includes('@');
      
      const codes = await prisma.verificationCode.findMany({
        where: {
          ...(isEmail ? { email: identifier } : { userId: identifier }),
          type,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return codes;
    } catch (error) {
      console.error('Error querying verification codes:', error);
      return [];
    }
  }

  /**
   * Query all verification codes by user identifier (across all types).
   * Returns all verification codes for a user, including expired ones for audit purposes.
   * 
   * @param identifier - User identifier (email or user ID)
   * @returns Promise resolving to array of verification codes
   * 
   * Requirements: 9.2 - Support querying verification codes by user identifier
   */
  async getCodesByIdentifier(identifier: string): Promise<any[]> {
    try {
      // Query by email or userId depending on the identifier format
      const isEmail = identifier.includes('@');
      
      const codes = await prisma.verificationCode.findMany({
        where: isEmail ? { email: identifier } : { userId: identifier },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return codes;
    } catch (error) {
      console.error('Error querying verification codes:', error);
      return [];
    }
  }

  /**
   * Get expired verification codes for audit purposes.
   * Returns codes that have expired but are retained for audit trail.
   * 
   * @param identifier - Optional user identifier to filter by
   * @returns Promise resolving to array of expired verification codes
   * 
   * Requirements: 5.4 - Maintain expired code records for audit purposes
   */
  async getExpiredCodes(identifier?: string): Promise<any[]> {
    try {
      const now = new Date();
      
      const codes = await prisma.verificationCode.findMany({
        where: {
          expiresAt: {
            lt: now,
          },
          ...(identifier && {
            OR: [
              { email: identifier },
              { userId: identifier },
            ],
          }),
        },
        orderBy: {
          expiresAt: 'desc',
        },
      });

      return codes;
    } catch (error) {
      console.error('Error querying expired verification codes:', error);
      return [];
    }
  }

  /**
   * Get verification code statistics for a user.
   * Returns counts of codes by status for audit and monitoring purposes.
   * 
   * @param identifier - User identifier (email or user ID)
   * @returns Promise resolving to statistics object
   * 
   * Requirements: 9.1, 9.2 - Support comprehensive code querying and metadata
   */
  async getCodeStatistics(identifier: string): Promise<{
    total: number;
    verified: number;
    expired: number;
    invalidated: number;
    pending: number;
  }> {
    try {
      const isEmail = identifier.includes('@');
      const now = new Date();
      
      const codes = await prisma.verificationCode.findMany({
        where: isEmail ? { email: identifier } : { userId: identifier },
      });

      const stats = {
        total: codes.length,
        verified: codes.filter(c => c.verified).length,
        expired: codes.filter(c => !c.verified && this.isCodeExpired(c.expiresAt)).length,
        invalidated: codes.filter(c => c.invalidated).length,
        pending: codes.filter(c => !c.verified && !c.invalidated && !this.isCodeExpired(c.expiresAt)).length,
      };

      return stats;
    } catch (error) {
      console.error('Error getting code statistics:', error);
      return {
        total: 0,
        verified: 0,
        expired: 0,
        invalidated: 0,
        pending: 0,
      };
    }
  }

  /**
   * Invalidate a specific verification code by ID.
   * Used for manual invalidation or cleanup operations.
   * 
   * @param codeId - Verification code ID
   * @returns Promise that resolves when the code is invalidated
   * 
   * Requirements: 5.3 - Store verification codes with complete metadata
   */
  async invalidateCode(codeId: string): Promise<void> {
    try {
      await prisma.verificationCode.update({
        where: { id: codeId },
        data: { invalidated: true },
      });
    } catch (error) {
      console.error('Error invalidating verification code:', error);
      throw error;
    }
  }


}

export const verificationService = new VerificationService();
