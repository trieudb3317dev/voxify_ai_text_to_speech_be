import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Otp } from "./otp.entity";
import { User } from "../user/user.entity";
import { OtpController } from "./otp.controller";
import { OtpService } from "./otp.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([Otp, User]),
    ],
    controllers: [OtpController],
    providers: [OtpService],
    exports: [OtpService],
})
export class OtpModule {}