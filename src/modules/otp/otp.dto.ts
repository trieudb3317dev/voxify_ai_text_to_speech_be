import { IsDate, IsString, Max } from "class-validator";

export class CreateOtpDto {
    @IsString({ message: 'Code must be a string' })
    @Max(3, { message: 'Code must be at most 3 characters long' })
    code: string;

    @IsDate({ message: 'Expiration date must be a valid date' })
    expires_at: Date
}