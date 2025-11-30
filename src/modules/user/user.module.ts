import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Otp } from '../otp/otp.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from '../auth/strategies/jwt-auth.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User, Otp]), AuthModule],
  controllers: [UserController],
  providers: [UserService, JwtService, JwtStrategy],
  exports: [UserService],
})
export class UserModule {}