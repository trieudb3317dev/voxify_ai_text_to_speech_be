import { Controller, Get, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

@Controller('debug/mail')
export class MailDebugController {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  status() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<string>('SMTP_PORT');
    const from = this.configService.get<string>('SMTP_FROM');
    const userProvided = !!this.configService.get<string>('SMTP_USER');
    // transporter is a private property on MailService; inspect it at runtime
    const transporterPresent = !!(this.mailService as any).transporter;

    return {
      mailerConfigured: transporterPresent,
      host: host || null,
      port: port || null,
      from: from || null,
      userProvided,
    };
  }

  @Post('send-test')
  async sendTest(@Body() body: { to?: string }) {
    const to = body?.to;
    const result = await this.mailService.sendEmail({
      to,
      subject: 'Test email from deployed app',
      text: 'This is a test email from the deployed application.',
    });
    return { ok: true, result };
  }
}
