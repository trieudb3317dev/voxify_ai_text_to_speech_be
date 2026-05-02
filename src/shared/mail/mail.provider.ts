import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export const MailProvider = {
  provide: 'MAIL_TRANSPORTER',
  useFactory: async (configService: ConfigService) => {
    // Read raw values and normalize because ConfigService returns strings from env
    let host = configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const portRaw = configService.get<string>('SMTP_PORT') || '587';
    const user = configService.get<string>('SMTP_USER');
    const pass = configService.get<string>('SMTP_PASS');
    const secureRaw = configService.get<string>('SMTP_SECURE');

    // normalize
    const port = parseInt(portRaw as any, 10) || 587;
    const secure =
      typeof secureRaw === 'string'
        ? /^(1|true)$/i.test(secureRaw)
        : !!secureRaw;
    // strip protocol if present
    host = host.replace(/^smtps?:\/\//i, '').replace(/\/$/, '');

    console.log('MailProvider: Starting mail transporter setup...');
    console.log(
      `🔍 MailProvider config: host=${host}, port=${port}, userProvided=${!!user}, secure=${secure}`,
    );

    if (!user || !pass) {
      console.log(
        '⚠️  SMTP_USER and SMTP_PASS not configured. Mail service will be disabled.',
      );
      return null;
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secure || port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });

      console.log(
        `🔍 MailProvider debug: attempting verify (host=${host}, port=${port}, secure=${secure || port === 465})`,
      );

      // set a verify timeout by wrapping in a Promise.race with timeout
      const verifyPromise = transporter.verify();
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('verify-timeout')), 10000),
      );
      await Promise.race([verifyPromise, timeout]);

      console.log('📧 Mail server connected successfully');
      return transporter;
    } catch (error: unknown) {
      // Log verify failure but still return a transporter so send attempts can run and show detailed errors
      const errMsg =
        error && typeof error === 'object' && 'message' in error
          ? (error as any).message
          : String(error);
      console.warn(
        '⚠️  MailProvider verify failed (will still return transporter):',
        errMsg,
      );
      console.warn('🔍 MailProvider verify error details (non-sensitive):', {
        host,
        port,
        userProvided: !!user,
      });
      try {
        return nodemailer.createTransport({
          host,
          port,
          secure: secure || port === 465,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
        });
      } catch (createErr: unknown) {
        const createMsg =
          createErr && typeof createErr === 'object' && 'message' in createErr
            ? (createErr as any).message
            : String(createErr);
        console.error('❌ Failed to create fallback transporter:', createMsg);
        return null;
      }
    }
  },
  inject: [ConfigService],
};
