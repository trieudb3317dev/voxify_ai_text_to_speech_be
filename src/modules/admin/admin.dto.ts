import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAdminDto {
  @IsString({ message: 'Username must be a string' })
  @Min(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @Min(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

export class UpdateAdminDto {
  @IsOptional()
  @IsString({ message: 'Full name must be a string' })
  full_name?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'], {
    message: 'Gender must be male, female, or other',
  })
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  day_of_birth?: Date;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  phone_number?: string;
}

export class AdminLoginDto {
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
  @IsEnum(['super_admin', 'admin', 'moderator', 'editor'], {
    message: 'Role must be super_admin, admin, moderator, or editor',
  })
  role: 'super_admin' | 'admin' | 'moderator' | 'editor';
}

export class AdminResponseDto {
  id: number;
  username: string;
  full_name?: string;
  gender?: 'male' | 'female' | 'other';
  role: 'super_admin' | 'admin' | 'moderator' | 'editor';
  day_of_birth?: Date;
  email: string;
  phone_number?: string;
  created_at: Date;
}
