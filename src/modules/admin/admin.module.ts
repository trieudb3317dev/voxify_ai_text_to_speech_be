import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './admin.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SharedModule } from 'src/shared/shared.module';
import { JwtAdminStrategy } from './strategies/jwt-admin.strategy';
import { User } from '../user/user.entity';
import { MailService } from 'src/shared/mail/mail.service';
import { Otp } from '../otp/otp.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User, Otp]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
    SharedModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, JwtService, JwtAdminStrategy],
  exports: [AdminService],
})
export class AdminModule {}
