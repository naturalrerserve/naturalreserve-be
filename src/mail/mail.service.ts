import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  // private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    // === SMTP Configuration (Commented out for Railway Free Tier) ===
    // this.transporter = nodemailer.createTransport({
    //   host: this.configService.get<string>('SMTP_HOST'),
    //   port: this.configService.get<number>('SMTP_PORT'),
    //   secure: this.configService.get<number>('SMTP_PORT') === 465, // true for 465, false for other ports
    //   auth: {
    //     user: this.configService.get<string>('SMTP_USER'),
    //     pass: this.configService.get<string>('SMTP_PASS'),
    //   },
    // });
  }

  // Helper method for Brevo HTTP API
  private async sendViaBrevo(toEmail: string, toName: string, subject: string, htmlContent: string): Promise<boolean> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    const senderEmail = this.configService.get<string>('SMTP_USER') || 'noreply@naturalreserve.com';
    const senderName = 'Natural Reserve';

    if (!apiKey) {
      this.logger.error('BREVO_API_KEY is not defined in environment variables. Email sending aborted.');
      return false;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ name: toName, email: toEmail }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Brevo API Error: ${response.status} - ${errorData}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email via Brevo HTTP API to ${toEmail}`, error);
      return false;
    }
  }

  async sendOtp(email: string, name: string, otp: string): Promise<boolean> {
    const subject = 'Kode Verifikasi OTP — Natural Reserve';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0d9488; text-align: center;">Natural Reserve</h2>
        <hr style="border-top: 1px solid #e2e8f0; margin-bottom: 20px;">
        <p>Halo <strong>${name}</strong>,</p>
        <p>Terima kasih telah mengajukan permintaan akses ke aplikasi Natural Reserve. Berikut adalah kode verifikasi OTP Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0d9488; background-color: #f0fdfa; padding: 10px 25px; border-radius: 6px; border: 1px dashed #0d9488;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 14px;">Kode OTP ini berlaku selama 15 menit. Mohon jangan sebarkan kode ini kepada siapa pun.</p>
        <hr style="border-top: 1px solid #e2e8f0; margin-top: 30px;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Ini adalah email otomatis, mohon tidak membalas email ini.</p>
      </div>
    `;

    // === Old SMTP code (commented out) ===
    // const from = this.configService.get<string>('SMTP_FROM') || 'Natural Reserve <noreply@gmail.com>';
    // const mailOptions = { from, to: email, subject, html };
    // try {
    //   await this.transporter.sendMail(mailOptions);
    //   this.logger.log(`OTP successfully sent to ${email}`);
    //   return true;
    // } catch (error) { ... }

    // === New Brevo HTTP API code ===
    const success = await this.sendViaBrevo(email, name, subject, html);
    if (success) {
      this.logger.log(`OTP successfully sent to ${email} via Brevo HTTP API`);
    }
    return success;
  }

  async sendAccountApproved(email: string, name: string, username: string, accessCode: string): Promise<boolean> {
    const subject = 'Permintaan Akses Disetujui — Natural Reserve';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0d9488; text-align: center;">Natural Reserve</h2>
        <h3 style="color: #0d9488; text-align: center;">Permintaan Akses Disetujui! 🎉</h3>
        <hr style="border-top: 1px solid #e2e8f0; margin-bottom: 20px;">
        <p>Halo <strong>${name}</strong>,</p>
        <p>Selamat! Permintaan akses Anda telah disetujui oleh Administrator. Anda sekarang dapat masuk ke sistem menggunakan detail berikut:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 6px;">
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; width: 120px;">Username:</td>
            <td style="padding: 12px; font-family: monospace; font-size: 16px; border-bottom: 1px solid #e2e8f0; color: #0d9488;">${username}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; width: 120px;">Kode Akses:</td>
            <td style="padding: 12px; font-family: monospace; font-size: 18px; border-bottom: 1px solid #e2e8f0; color: #ef4444; font-weight: bold; letter-spacing: 2px;">${accessCode}</td>
          </tr>
        </table>
        <p>Silakan klik tombol di bawah untuk menuju ke halaman login:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}" style="background-color: #0d9488; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Masuk ke Aplikasi
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;"><strong>Penting:</strong> Gunakan password yang Anda buat saat mendaftar untuk login.</p>
        <hr style="border-top: 1px solid #e2e8f0; margin-top: 30px;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Jika ada kendala, hubungi administrator sistem.</p>
      </div>
    `;

    // === Old SMTP code (commented out) ===
    // const from = this.configService.get<string>('SMTP_FROM') || 'Natural Reserve <noreply@gmail.com>';
    // const mailOptions = { from, to: email, subject, html };
    // try {
    //   await this.transporter.sendMail(mailOptions);
    //   this.logger.log(`Account approval email successfully sent to ${email}`);
    //   return true;
    // } catch (error) { ... }

    // === New Brevo HTTP API code ===
    const success = await this.sendViaBrevo(email, name, subject, html);
    if (success) {
      this.logger.log(`Account approval email successfully sent to ${email} via Brevo HTTP API`);
    }
    return success;
  }
}
