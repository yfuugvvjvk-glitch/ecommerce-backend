import nodemailer from 'nodemailer';

// Mock nodemailer before importing the service
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

import emailService, { EmailType, PasswordChangeDetails } from '../email.service';

describe('EmailService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({
      messageId: 'test-message-id',
    });
  });

  describe('renderTemplate', () => {
    it('should render registration verification template in Romanian', () => {
      const code = '123456';
      const { subject, html, text } = emailService.renderTemplate(
        EmailType.REGISTRATION_VERIFICATION,
        { code }
      );

      expect(subject).toBe('Verificați adresa de email');
      expect(html).toContain(code);
      expect(html).toContain('Bun venit!');
      expect(html).toContain('15 minute');
      expect(text).toContain(code);
      expect(text).toContain('Bun venit!');
    });

    it('should render email change verification template in Romanian', () => {
      const code = '654321';
      const { subject, html, text } = emailService.renderTemplate(
        EmailType.EMAIL_CHANGE_VERIFICATION,
        { code }
      );

      expect(subject).toBe('Confirmați noua adresă de email');
      expect(html).toContain(code);
      expect(html).toContain('schimbarea adresei de email');
      expect(text).toContain(code);
    });

    it('should render email change notification template in Romanian', () => {
      const newEmail = 'newemail@example.com';
      const { subject, html, text } = emailService.renderTemplate(
        EmailType.EMAIL_CHANGE_NOTIFICATION,
        { newEmail }
      );

      expect(subject).toBe('Notificare: Schimbare adresă de email');
      expect(html).toContain(newEmail);
      expect(html).toContain('Dacă nu ați solicitat');
      expect(text).toContain(newEmail);
    });

    it('should render password change notification template in Romanian', () => {
      const details = {
        timestamp: new Date('2024-01-15T10:30:00'),
        ipAddress: '192.168.1.1',
        deviceInfo: 'Chrome on Windows',
        userAgent: 'Mozilla/5.0',
      };
      const { subject, html, text } = emailService.renderTemplate(
        EmailType.PASSWORD_CHANGE_NOTIFICATION,
        details
      );

      expect(subject).toBe('Notificare: Parola a fost schimbată');
      expect(html).toContain(details.ipAddress);
      expect(html).toContain(details.deviceInfo);
      expect(html).toContain('Dacă nu ați fost dvs.');
      expect(text).toContain(details.ipAddress);
    });

    it('should render phone change verification template in Romanian', () => {
      const code = '789012';
      const { subject, html, text } = emailService.renderTemplate(
        EmailType.PHONE_CHANGE_VERIFICATION,
        { code }
      );

      expect(subject).toBe('Confirmați noul număr de telefon');
      expect(html).toContain(code);
      expect(html).toContain('număr de telefon');
      expect(text).toContain(code);
    });

    it('should render account lockout notification template in Romanian', () => {
      const { subject, html, text } = emailService.renderTemplate(
        EmailType.ACCOUNT_LOCKOUT_NOTIFICATION,
        {}
      );

      expect(subject).toBe('Cont blocat temporar');
      expect(html).toContain('blocat temporar');
      expect(html).toContain('1 oră');
      expect(text).toContain('blocat temporar');
    });

    it('should include both HTML and plain text versions', () => {
      const code = '123456';
      const { html, text } = emailService.renderTemplate(
        EmailType.REGISTRATION_VERIFICATION,
        { code }
      );

      // HTML should contain HTML tags
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      
      // Text should not contain HTML tags
      expect(text).not.toContain('<html>');
      expect(text).not.toContain('</html>');
      
      // Both should contain the code
      expect(html).toContain(code);
      expect(text).toContain(code);
    });
  });

  describe('sendEmailChangeNotification', () => {
    it('should send email change notification to old email address', async () => {
      const oldEmail = 'old@example.com';
      const newEmail = 'new@example.com';

      const result = await emailService.sendEmailChangeNotification(oldEmail, newEmail);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(oldEmail);
      expect(callArgs.subject).toBe('Notificare: Schimbare adresă de email');
      expect(callArgs.html).toContain(newEmail);
      expect(callArgs.text).toContain(newEmail);
    });

    it('should include warning message in notification', async () => {
      const oldEmail = 'old@example.com';
      const newEmail = 'new@example.com';

      await emailService.sendEmailChangeNotification(oldEmail, newEmail);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Dacă nu ați solicitat');
      expect(callArgs.text).toContain('Dacă nu ați solicitat');
    });

    it('should return error when email sending fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

      const result = await emailService.sendEmailChangeNotification(
        'old@example.com',
        'new@example.com'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nu am putut trimite notificarea. Vă rugăm să încercați din nou.');
    });

    it('should send both HTML and plain text versions', async () => {
      await emailService.sendEmailChangeNotification('old@example.com', 'new@example.com');

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.html).toBeDefined();
      expect(callArgs.text).toBeDefined();
      expect(callArgs.html).toContain('<html>');
      expect(callArgs.text).not.toContain('<html>');
    });
  });

  describe('sendPasswordChangeNotification', () => {
    const mockDetails: PasswordChangeDetails = {
      timestamp: new Date('2024-01-15T10:30:00'),
      ipAddress: '192.168.1.100',
      deviceInfo: 'Chrome on Windows 10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    };

    it('should send password change notification with all required details', async () => {
      const email = 'user@example.com';

      const result = await emailService.sendPasswordChangeNotification(email, mockDetails);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.to).toBe(email);
      expect(callArgs.subject).toBe('Notificare: Parola a fost schimbată');
    });

    it('should include timestamp in notification (Requirement 3.2)', async () => {
      await emailService.sendPasswordChangeNotification('user@example.com', mockDetails);

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      // Check that the formatted date is included
      expect(callArgs.html).toContain('Data și ora:');
      expect(callArgs.text).toContain('Data și ora:');
    });

    it('should include IP address in notification (Requirement 3.3)', async () => {
      await emailService.sendPasswordChangeNotification('user@example.com', mockDetails);

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.html).toContain(mockDetails.ipAddress);
      expect(callArgs.html).toContain('Adresa IP:');
      expect(callArgs.text).toContain(mockDetails.ipAddress);
      expect(callArgs.text).toContain('Adresa IP:');
    });

    it('should include device info in notification (Requirement 3.4)', async () => {
      await emailService.sendPasswordChangeNotification('user@example.com', mockDetails);

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.html).toContain(mockDetails.deviceInfo);
      expect(callArgs.html).toContain('Dispozitiv:');
      expect(callArgs.text).toContain(mockDetails.deviceInfo);
      expect(callArgs.text).toContain('Dispozitiv:');
    });

    it('should include "If this wasn\'t you" warning (Requirement 3.5)', async () => {
      await emailService.sendPasswordChangeNotification('user@example.com', mockDetails);

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.html).toContain('Dacă nu ați fost dvs.');
      expect(callArgs.text).toContain('Dacă nu ați fost dvs.');
    });

    it('should include user agent when provided', async () => {
      await emailService.sendPasswordChangeNotification('user@example.com', mockDetails);

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.html).toContain(mockDetails.userAgent);
      expect(callArgs.html).toContain('Browser:');
    });

    it('should work without user agent', async () => {
      const detailsWithoutUA = {
        timestamp: new Date('2024-01-15T10:30:00'),
        ipAddress: '192.168.1.100',
        deviceInfo: 'Chrome on Windows 10',
      };

      const result = await emailService.sendPasswordChangeNotification(
        'user@example.com',
        detailsWithoutUA
      );

      expect(result.success).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).not.toContain('Browser:');
    });

    it('should return error when email sending fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

      const result = await emailService.sendPasswordChangeNotification(
        'user@example.com',
        mockDetails
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nu am putut trimite notificarea. Vă rugăm să încercați din nou.');
    });

    it('should send both HTML and plain text versions', async () => {
      await emailService.sendPasswordChangeNotification('user@example.com', mockDetails);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toBeDefined();
      expect(callArgs.text).toBeDefined();
      expect(callArgs.html).toContain('<html>');
      expect(callArgs.text).not.toContain('<html>');
    });

    it('should be in Romanian language (Requirement 3.1)', async () => {
      await emailService.sendPasswordChangeNotification('user@example.com', mockDetails);

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.subject).toBe('Notificare: Parola a fost schimbată');
      expect(callArgs.html).toContain('Parola a fost schimbată');
      expect(callArgs.text).toContain('Parola a fost schimbată');
    });
  });

  describe('sendAccountLockoutNotification', () => {
    it('should send account lockout notification (Requirement 7.4)', async () => {
      const email = 'user@example.com';

      const result = await emailService.sendAccountLockoutNotification(email);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.to).toBe(email);
      expect(callArgs.subject).toBe('Cont blocat temporar');
    });

    it('should include lockout duration in notification', async () => {
      await emailService.sendAccountLockoutNotification('user@example.com');

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.html).toContain('1 oră');
      expect(callArgs.text).toContain('1 oră');
    });

    it('should include security advice in notification', async () => {
      await emailService.sendAccountLockoutNotification('user@example.com');

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.html).toContain('Dacă nu ați fost dvs.');
      expect(callArgs.html).toContain('schimbați parola');
      expect(callArgs.text).toContain('Dacă nu ați fost dvs.');
    });

    it('should return error when email sending fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

      const result = await emailService.sendAccountLockoutNotification('user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nu am putut trimite notificarea. Vă rugăm să încercați din nou.');
    });

    it('should send both HTML and plain text versions', async () => {
      await emailService.sendAccountLockoutNotification('user@example.com');

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.html).toBeDefined();
      expect(callArgs.text).toBeDefined();
      expect(callArgs.html).toContain('<html>');
      expect(callArgs.text).not.toContain('<html>');
    });

    it('should be in Romanian language', async () => {
      await emailService.sendAccountLockoutNotification('user@example.com');

      const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
      expect(callArgs.subject).toBe('Cont blocat temporar');
      expect(callArgs.html).toContain('blocat temporar');
      expect(callArgs.text).toContain('blocat temporar');
    });
  });
});
