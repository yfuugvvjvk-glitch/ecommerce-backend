import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export enum EmailType {
  REGISTRATION_VERIFICATION = 'REGISTRATION_VERIFICATION',
  EMAIL_CHANGE_VERIFICATION = 'EMAIL_CHANGE_VERIFICATION',
  EMAIL_CHANGE_NOTIFICATION = 'EMAIL_CHANGE_NOTIFICATION',
  PASSWORD_CHANGE_NOTIFICATION = 'PASSWORD_CHANGE_NOTIFICATION',
  PHONE_CHANGE_VERIFICATION = 'PHONE_CHANGE_VERIFICATION',
  ACCOUNT_LOCKOUT_NOTIFICATION = 'ACCOUNT_LOCKOUT_NOTIFICATION',
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface PasswordChangeDetails {
  timestamp: Date;
  ipAddress: string;
  deviceInfo: string;
  userAgent?: string;
}

class EmailService {
  private transporter: Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    // Initialize nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@example.com';
    this.fromName = process.env.SMTP_FROM_NAME || 'Aplicație';
  }

  /**
   * Send verification code email
   */
  async sendVerificationCode(
    to: string,
    code: string,
    type: EmailType
  ): Promise<EmailResult> {
    try {
      const { subject, html, text } = this.renderTemplate(type, { code });

      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: 'Nu am putut trimite email-ul de verificare. Vă rugăm să încercați din nou.',
      };
    }
  }

  /**
   * Send email change notification to old email
   */
  async sendEmailChangeNotification(
    to: string,
    newEmail: string
  ): Promise<EmailResult> {
    try {
      const { subject, html, text } = this.renderTemplate(
        EmailType.EMAIL_CHANGE_NOTIFICATION,
        { newEmail }
      );

      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: 'Nu am putut trimite notificarea. Vă rugăm să încercați din nou.',
      };
    }
  }

  /**
   * Send password change notification
   */
  async sendPasswordChangeNotification(
    to: string,
    details: PasswordChangeDetails
  ): Promise<EmailResult> {
    try {
      const { subject, html, text } = this.renderTemplate(
        EmailType.PASSWORD_CHANGE_NOTIFICATION,
        details
      );

      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: 'Nu am putut trimite notificarea. Vă rugăm să încercați din nou.',
      };
    }
  }

  /**
   * Send account lockout notification
   */
  async sendAccountLockoutNotification(to: string): Promise<EmailResult> {
    try {
      const { subject, html, text } = this.renderTemplate(
        EmailType.ACCOUNT_LOCKOUT_NOTIFICATION,
        {}
      );

      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: 'Nu am putut trimite notificarea. Vă rugăm să încercați din nou.',
      };
    }
  }

  /**
   * Render email template with data
   */
  renderTemplate(
    templateName: EmailType,
    data: any
  ): { subject: string; html: string; text: string } {
    switch (templateName) {
      case EmailType.REGISTRATION_VERIFICATION:
        return this.registrationVerificationTemplate(data.code);

      case EmailType.EMAIL_CHANGE_VERIFICATION:
        return this.emailChangeVerificationTemplate(data.code);

      case EmailType.EMAIL_CHANGE_NOTIFICATION:
        return this.emailChangeNotificationTemplate(data.newEmail);

      case EmailType.PASSWORD_CHANGE_NOTIFICATION:
        return this.passwordChangeNotificationTemplate(data);

      case EmailType.PHONE_CHANGE_VERIFICATION:
        return this.phoneChangeVerificationTemplate(data.code);

      case EmailType.ACCOUNT_LOCKOUT_NOTIFICATION:
        return this.accountLockoutNotificationTemplate();

      default:
        throw new Error(`Unknown template: ${templateName}`);
    }
  }

  /**
   * Registration verification email template (Romanian)
   */
  private registrationVerificationTemplate(code: string) {
    const subject = 'Verificați adresa de email';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .code { font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; padding: 20px; background-color: #fff; border: 2px dashed #4CAF50; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bun venit!</h1>
          </div>
          <div class="content">
            <p>Vă mulțumim că v-ați înregistrat!</p>
            <p>Pentru a finaliza înregistrarea, vă rugăm să introduceți codul de verificare de mai jos:</p>
            <div class="code">${code}</div>
            <p><strong>Codul este valabil 15 minute.</strong></p>
            <p>Dacă nu ați solicitat această înregistrare, vă rugăm să ignorați acest email.</p>
          </div>
          <div class="footer">
            <p>Acest email a fost trimis automat. Vă rugăm să nu răspundeți.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Bun venit!

Vă mulțumim că v-ați înregistrat!

Pentru a finaliza înregistrarea, vă rugăm să introduceți codul de verificare:

${code}

Codul este valabil 15 minute.

Dacă nu ați solicitat această înregistrare, vă rugăm să ignorați acest email.
    `;

    return { subject, html, text };
  }

  /**
   * Email change verification template (Romanian)
   */
  private emailChangeVerificationTemplate(code: string) {
    const subject = 'Confirmați noua adresă de email';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .code { font-size: 32px; font-weight: bold; color: #2196F3; text-align: center; padding: 20px; background-color: #fff; border: 2px dashed #2196F3; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Confirmați noua adresă de email</h1>
          </div>
          <div class="content">
            <p>Ați solicitat schimbarea adresei de email.</p>
            <p>Pentru a confirma noua adresă, vă rugăm să introduceți codul de verificare:</p>
            <div class="code">${code}</div>
            <p><strong>Codul este valabil 15 minute.</strong></p>
            <p>Dacă nu ați solicitat această schimbare, vă rugăm să ignorați acest email.</p>
          </div>
          <div class="footer">
            <p>Acest email a fost trimis automat. Vă rugăm să nu răspundeți.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Confirmați noua adresă de email

Ați solicitat schimbarea adresei de email.

Pentru a confirma noua adresă, vă rugăm să introduceți codul de verificare:

${code}

Codul este valabil 15 minute.

Dacă nu ați solicitat această schimbare, vă rugăm să ignorați acest email.
    `;

    return { subject, html, text };
  }

  /**
   * Email change notification template (Romanian)
   */
  private emailChangeNotificationTemplate(newEmail: string) {
    const subject = 'Notificare: Schimbare adresă de email';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .warning { background-color: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Notificare: Schimbare adresă de email</h1>
          </div>
          <div class="content">
            <p>Vă informăm că a fost solicitată o schimbare a adresei de email pentru contul dvs.</p>
            <p><strong>Noua adresă de email:</strong> ${newEmail}</p>
            <div class="warning">
              <p><strong>⚠️ Dacă nu ați solicitat această schimbare:</strong></p>
              <p>Vă rugăm să vă securizați imediat contul și să ne contactați.</p>
            </div>
          </div>
          <div class="footer">
            <p>Acest email a fost trimis automat. Vă rugăm să nu răspundeți.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Notificare: Schimbare adresă de email

Vă informăm că a fost solicitată o schimbare a adresei de email pentru contul dvs.

Noua adresă de email: ${newEmail}

⚠️ Dacă nu ați solicitat această schimbare:
Vă rugăm să vă securizați imediat contul și să ne contactați.
    `;

    return { subject, html, text };
  }

  /**
   * Password change notification template (Romanian)
   */
  private passwordChangeNotificationTemplate(details: PasswordChangeDetails) {
    const subject = 'Notificare: Parola a fost schimbată';
    const formattedDate = details.timestamp.toLocaleString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F44336; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .details { background-color: #fff; padding: 15px; margin: 20px 0; border-left: 4px solid #F44336; }
          .warning { background-color: #ffebee; border: 2px solid #F44336; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Parola a fost schimbată</h1>
          </div>
          <div class="content">
            <p>Vă informăm că parola pentru contul dvs. a fost schimbată cu succes.</p>
            <div class="details">
              <p><strong>Data și ora:</strong> ${formattedDate}</p>
              <p><strong>Adresa IP:</strong> ${details.ipAddress}</p>
              <p><strong>Dispozitiv:</strong> ${details.deviceInfo}</p>
              ${details.userAgent ? `<p><strong>Browser:</strong> ${details.userAgent}</p>` : ''}
            </div>
            <div class="warning">
              <p><strong>⚠️ Dacă nu ați fost dvs.:</strong></p>
              <p>Vă rugăm să vă securizați imediat contul și să ne contactați de urgență.</p>
            </div>
          </div>
          <div class="footer">
            <p>Acest email a fost trimis automat. Vă rugăm să nu răspundeți.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Parola a fost schimbată

Vă informăm că parola pentru contul dvs. a fost schimbată cu succes.

Detalii:
- Data și ora: ${formattedDate}
- Adresa IP: ${details.ipAddress}
- Dispozitiv: ${details.deviceInfo}
${details.userAgent ? `- Browser: ${details.userAgent}` : ''}

⚠️ Dacă nu ați fost dvs.:
Vă rugăm să vă securizați imediat contul și să ne contactați de urgență.
    `;

    return { subject, html, text };
  }

  /**
   * Phone change verification template (Romanian)
   */
  private phoneChangeVerificationTemplate(code: string) {
    const subject = 'Confirmați noul număr de telefon';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #9C27B0; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .code { font-size: 32px; font-weight: bold; color: #9C27B0; text-align: center; padding: 20px; background-color: #fff; border: 2px dashed #9C27B0; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Confirmați noul număr de telefon</h1>
          </div>
          <div class="content">
            <p>Ați solicitat schimbarea numărului de telefon.</p>
            <p>Pentru a confirma schimbarea, vă rugăm să introduceți codul de verificare:</p>
            <div class="code">${code}</div>
            <p><strong>Codul este valabil 15 minute.</strong></p>
            <p>Dacă nu ați solicitat această schimbare, vă rugăm să ignorați acest email.</p>
          </div>
          <div class="footer">
            <p>Acest email a fost trimis automat. Vă rugăm să nu răspundeți.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Confirmați noul număr de telefon

Ați solicitat schimbarea numărului de telefon.

Pentru a confirma schimbarea, vă rugăm să introduceți codul de verificare:

${code}

Codul este valabil 15 minute.

Dacă nu ați solicitat această schimbare, vă rugăm să ignorați acest email.
    `;

    return { subject, html, text };
  }

  /**
   * Account lockout notification template (Romanian)
   */
  private accountLockoutNotificationTemplate() {
    const subject = 'Cont blocat temporar';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F44336; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; }
          .warning { background-color: #ffebee; border: 2px solid #F44336; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Cont blocat temporar</h1>
          </div>
          <div class="content">
            <div class="warning">
              <p><strong>Contul dvs. a fost blocat temporar din cauza prea multor încercări eșuate de verificare.</strong></p>
            </div>
            <p>Din motive de securitate, contul dvs. a fost blocat pentru <strong>1 oră</strong>.</p>
            <p>După expirarea acestei perioade, veți putea accesa din nou contul.</p>
            <p><strong>Dacă nu ați fost dvs.:</strong></p>
            <ul>
              <li>Vă rugăm să vă schimbați parola imediat după deblocare</li>
              <li>Verificați activitatea recentă a contului</li>
              <li>Contactați-ne dacă observați activitate suspectă</li>
            </ul>
          </div>
          <div class="footer">
            <p>Acest email a fost trimis automat. Vă rugăm să nu răspundeți.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
⚠️ Cont blocat temporar

Contul dvs. a fost blocat temporar din cauza prea multor încercări eșuate de verificare.

Din motive de securitate, contul dvs. a fost blocat pentru 1 oră.

După expirarea acestei perioade, veți putea accesa din nou contul.

Dacă nu ați fost dvs.:
- Vă rugăm să vă schimbați parola imediat după deblocare
- Verificați activitatea recentă a contului
- Contactați-ne dacă observați activitate suspectă
    `;

    return { subject, html, text };
  }
}

export default new EmailService();
