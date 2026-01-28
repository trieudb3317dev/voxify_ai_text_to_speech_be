import { Injectable, Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as sendgrid from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private sendGridEnabled = false;

  constructor(
    @Inject('MAIL_TRANSPORTER') private transporter: nodemailer.Transporter,
    private configService: ConfigService,
  ) {
    this.fromEmail =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER');
    this.fromName = this.configService.get<string>(
      'SMTP_FROM_NAME',
      'NestJS App',
    );

    const sgKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sgKey) {
      try {
        sendgrid.setApiKey(sgKey);
        this.sendGridEnabled = true;
        console.log('🔁 SendGrid API enabled for mail delivery');
      } catch (err) {
        console.warn('⚠️  Failed to initialize SendGrid client:', err && (err.message || err));
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<nodemailer.SentMessageInfo> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };
    console.log(`📧 Sending email to: ${mailOptions.to} with subject: "${mailOptions.subject}"`);

    // Prefer SendGrid HTTP API when available (more reliable from cloud hosts)
    if (this.sendGridEnabled) {
      try {
        const msg = {
          to: mailOptions.to,
          from: { email: this.fromEmail, name: this.fromName },
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text,
        } as any;
        const [response] = await sendgrid.send(msg);
        console.log(`✅ SendGrid accepted email to: ${mailOptions.to}`);
        return response as any;
      } catch (err) {
        console.error('❌ SendGrid send error:', err && (err.message || err));
        // fall through to SMTP transporter fallback
      }
    }

    // If transporter is not configured (e.g. SMTP credentials not provided in env)
    // the MailProvider returns null. Avoid calling sendMail on null to prevent
    // runtime exceptions in production. Log and return a dummy result instead.
    console.log('Transporter:', this.transporter ? 'configured' : 'not configured');
    if (!this.transporter) {
      console.warn(`⚠️  Mail transporter not configured. Skipping email to: ${options.to}`);
      return Promise.resolve({
        accepted: [],
        rejected: [],
        envelope: undefined,
        messageId: 'mail-disabled',
        response: 'Mail transporter not configured',
      } as any);
    }

    const result = await this.transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${options.to}`);
    return result;
  }  

  async sendWelcomeEmail(
    to: string,
    username: string,
  ): Promise<nodemailer.SentMessageInfo> {
    return this.sendEmail({
      to,
      subject: 'Chào mừng bạn!',
      html: `
        <h2>Chào mừng ${username}!</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản.</p>
        <p>Email: ${to}</p>
      `,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    username: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to,
      subject: 'Đặt lại mật khẩu',
      html: `
        <h2>Xin chào ${username}!</h2>
        <p>Click vào link sau để đặt lại mật khẩu:</p>
        <a href="${resetUrl}">Đặt lại mật khẩu</a>
        <p>Link: ${resetUrl}</p>
      `,
    });
  }

  async sendNotificationEmail(
    to: string | string[],
    title: string,
    message: string,
  ): Promise<nodemailer.SentMessageInfo> {
    return this.sendEmail({
      to,
      subject: title,
      html: `
        <h2>${title}</h2>
        <p>${message}</p>
      `,
    });
  }

  async sendAccountCreationEmail(
    to: string | string[],
    username: string,
    password: string,
    timer?: number,
    otp?: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const message = `
      <p>Xin chào ${username},</p>
      <p>Tài khoản của bạn đã được tạo thành công.</p>
      <p>Thông tin đăng nhập của bạn:</p>
      <ul>
        <li>Username: ${username}</li>
        <li>Password: ${password}</li>
      </ul>
      <p>Vui lòng xác thực tài khoản của bạn trước khi đăng nhập.</p>
      <p>Để xác thực, vui lòng click vào link sau: <a href="${this.configService.get<string>('FRONTEND_URL')}/verify-account?username=${username}&code=${otp}">Xác thực tài khoản</a></p>
      </p>
      <p>Thời gian hiệu lực của link xác thực là 15 phút.</p>
      <ul>
        <li>Nếu bạn không xác thực trong vòng ${timer || 15} phút, tài khoản của bạn sẽ bị xóa tự động.</li>
        <li>Nếu bạn đã xác thực, vui lòng bỏ qua email này.</li>
      </ul>
      <p>Mã OTP của bạn là: <strong>${otp}</strong></p>
      <p>Trân trọng,</p>
      <p>Đội ngũ hỗ trợ</p>
      <ul>
        <li>Tên: ${this.fromName}</li>
        <li>Email: ${this.fromEmail}</li>
      </ul>
      <p>Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.</p>
    `;

    return this.sendNotificationEmail(to, 'Tài khoản đã được tạo', message);
  }

  async sendAccountBlockedEmail(
    to: string | string[],
    username: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const message = `
      <p>Xin chào ${username},</p>
      <p>Tài khoản của bạn đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ nếu bạn có thắc mắc.</p>
      <p>Trân trọng,</p>
      <p>Đội ngũ hỗ trợ</p>
      <ul>
        <li>Tên: ${this.fromName}</li>
        <li>Email: ${this.fromEmail}</li>
      </ul>
    `;

    return this.sendNotificationEmail(to, 'Tài khoản bị khóa', message);
  }

  // add logic to send email notification about account status change
  async sendAccountStatusChangeEmail(
    to: string | string[],
    username: string,
    isActive: boolean,
  ): Promise<nodemailer.SentMessageInfo> {
    return this.sendAccountBlockedEmail(to, username);
  }
}
