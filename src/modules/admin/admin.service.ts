import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin, AdminRole } from './admin.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  AdminLoginDto,
  AdminResponseDto,
  CreateAdminDto,
  PayloadDto,
  UpdateAdminDto,
} from './admin.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { GenderType } from '../user/user.entity';

@Injectable()
export class AdminService {
  // Implement admin service methods here
  private readonly logger = new Logger(AdminService.name);
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  async create(adminData: CreateAdminDto): Promise<{ message: string }> {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      const exists = await this.adminRepository.findOne({
        where: { username: adminData.username },
      });
      if (exists) {
        throw new HttpException(
          'Username already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      const newAdmin = this.adminRepository.create({
        ...adminData,
        password: hashedPassword,
        role: AdminRole[adminData.role?.toUpperCase()] || AdminRole.ADMIN,
      });
      await this.adminRepository.save(newAdmin);
      return { message: 'Admin created successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to create admin: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async login(
    loginDto: AdminLoginDto,
    response: Response,
  ): Promise<{ message: string }> {
    try {
      const user = await this.adminRepository.findOne({
        where: { username: loginDto.username },
      });
      const passwordIsValid = user
        ? bcrypt.compareSync(loginDto.password, user.password)
        : false;
      if (!user || !passwordIsValid) {
        throw new HttpException(
          'Invalid username or password',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const payload: PayloadDto = {
        username: user.username,
        role: user.role,
        id: user.id,
      };
      this.generateAccessToken(payload, response);
      this.generateRefreshToken(payload, response);
      return { message: 'Login successful' };
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(
          `Login failed for user ${loginDto.username}: ${error.message}`,
        );
        throw error;
      }
      this.logger.error(
        `Login failed for user ${loginDto.username}: ${error.message}`,
      );
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async logout(response: Response): Promise<{ message: string }> {
    try {
      response.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.PRODUCTION_DOMAIN
            : 'localhost',
      });
      response.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.PRODUCTION_DOMAIN
            : 'localhost',
      });
      return { message: 'Logout successful' };
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(`Logout failed: ${error.message}`);
        throw error;
      }
      this.logger.error(`Logout failed: ${error.message}`);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async validateUser(username: string): Promise<Admin | null> {
    try {
      const user = await this.adminRepository.findOne({
        where: { username: username },
      });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(
          `Validation failed for user ${username}: ${error.message}`,
        );
        throw error;
      }
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get admin profile by ID
   */

  async profile(userId: number): Promise<AdminResponseDto> {
    try {
      const user = await this.adminRepository.findOne({
        where: { id: userId, is_active: false },
      });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar: user.avatar,
        gender: user.gender,
        role: user.role,
        day_of_birth: user.day_of_birth,
        email: user.email,
        phone_number: user.phone_number,
        created_at: user.created_at,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch user profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateProfile(
    userId: number,
    updatedData: UpdateAdminDto,
  ): Promise<{ message: string } | Admin> {
    try {
      const user = await this.adminRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      await this.adminRepository.update(userId, {
        ...updatedData,
        full_name: updatedData.full_name ?? user.full_name,
        avatar: updatedData.avatar ?? user.avatar,
        gender: GenderType[updatedData.gender?.toUpperCase()] ?? user.gender,
        day_of_birth: updatedData.day_of_birth ?? user.day_of_birth,
        phone_number: updatedData.phone_number ?? user.phone_number,
      });
      return { message: 'User profile updated successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private generateAccessToken(user: PayloadDto, response: Response): string {
    const payload = { username: user.username, role: user.role, sub: user.id };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      domain:
        process.env.NODE_ENV === 'production'
          ? process.env.PRODUCTION_DOMAIN
          : 'localhost',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return token;
  }

  private async generateRefreshToken(
    user: PayloadDto,
    response: Response,
  ): Promise<string> {
    const payload = { username: user.username, role: user.role, sub: user.id };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
    response.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      domain:
        process.env.NODE_ENV === 'production'
          ? process.env.PRODUCTION_DOMAIN
          : 'localhost',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return token;
  }

  private async generateOtp(): Promise<string> {
    const otps = '0123456789';
    let otpCode = '';
    for (let i = 0; i < 3; i++) {
      otpCode += otps.charAt(Math.floor(Math.random() * otps.length));
    }
    return otpCode;
  }
}
