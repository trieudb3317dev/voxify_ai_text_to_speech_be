import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export const MailProvider = {
  provide: 'MAIL_TRANSPORTER',
  useFactory: async (configService: ConfigService) => {
    const host = configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = configService.get<number>('SMTP_PORT', 587);
    const user = configService.get<string>('SMTP_USER');
    const pass = configService.get<string>('SMTP_PASS');
    const secure = configService.get<boolean>('SMTP_SECURE', false);

    // Nếu không có user hoặc pass, trả về null thay vì ném lỗi
    if (!user || !pass) {
      console.log('⚠️  SMTP_USER and SMTP_PASS not configured. Mail service will be disabled.');
      console.log(`🔍 MailProvider debug: host=${host}, port=${port}, userProvided=${!!user}, secure=${secure}`);
      return null;
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secure || port === 465,
        auth: { user, pass },
        // allow less strict TLS in some providers; you can tune this if needed
        tls: { rejectUnauthorized: false },
      });

      console.log(`🔍 MailProvider debug: attempting verify (host=${host}, port=${port}, secure=${secure || port === 465})`);

      await transporter.verify();
      console.log('📧 Mail server connected successfully');
      return transporter;
    } catch (error) {
      console.error('❌ Failed to connect to mail server:', error && (error.message || error));
      console.error('🔍 MailProvider verify error details (non-sensitive):', {
        host,
        port,
        userProvided: !!user,
      });
      return null;
    }
  },
  inject: [ConfigService],
}; 