import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { User } from "../user/user.entity";
import { Otp } from "../otp/otp.entity";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SharedModule } from "src/shared/shared.module";
import { JwtStrategy } from "./strategies/jwt-auth.strategy";

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Otp]),
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
        SharedModule
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }