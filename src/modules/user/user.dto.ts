import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateUserDto {
    @IsString({ message: 'Username must be a string' })
    @Min(3, { message: 'Username must be at least 3 characters long' })
    username: string;

    @IsEmail({}, { message: 'Email must be a valid email address' })
    email: string;

    @IsString({ message: 'Password must be a string' })
    @Min(6, { message: 'Password must be at least 6 characters long' })
    password: string;
}

export class UpdateUserDto {
    @IsOptional()
    @IsString({ message: 'Full name must be a string' })
    full_name?: string;

    @IsOptional()
    @IsEnum(['male', 'female', 'other'], { message: 'Gender must be male, female, or other' })
    gender?: 'male' | 'female' | 'other';

    @IsOptional()
    day_of_birth?: Date;

    @IsOptional()
    @IsString({ message: 'Phone number must be a string' })
    phone_number?: string;
}

export class UserLoginDto {
    @IsString({ message: 'Username must be a string' })
    username: string;
    @IsString({ message: 'Password must be a string' })
    password: string;
}

export class PayloadDto {
    @IsNumber({}, { message: 'ID must be a number' })
    id: number;
    @IsString({ message: 'Username must be a string' })
    username: string;
}

export class ForgotPasswordDto {
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email: string;
}

export class ResetPasswordDto {
    @IsString({ message: 'Reset token must be a string' })
    reset_token: string;
    @IsString({ message: 'New password must be a string' })
    @Min(6, { message: 'New password must be at least 6 characters long' })
    new_password: string;
}

export class UserResponseDto {
    id: number;
    username: string;
    full_name?: string;
    gender?: 'male' | 'female' | 'other';
    day_of_birth?: Date;
    email: string;
    phone_number?: string;
    created_at: Date;
}