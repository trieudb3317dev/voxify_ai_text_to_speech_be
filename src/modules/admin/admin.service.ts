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
import { GenderType, User } from '../user/user.entity';
import { UserResponseDto } from '../user/user.dto';
import { MailService } from 'src/shared/mail/mail.service';
import { Otp } from '../otp/otp.entity';

@Injectable()
export class AdminService {
  // Implement admin service methods here
  private readonly logger = new Logger(AdminService.name);
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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

      const otp = await this.generateOtp();
      const otpEntity: Otp = this.otpRepository.create({
        user: newAdmin,
        code: otp,
        expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      });
      await this.otpRepository.save(otpEntity);

      await this.mailService.sendAccountCreationEmail(
        newAdmin.email,
        newAdmin.username,
        adminData.password,
        15,
        otp,
      );
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

  async verifyAdminAccount(
    username: string,
    code: string,
  ): Promise<{ message: string }> {
    try {
      const admin = await this.adminRepository.findOne({
        where: { username: username },
      });
      if (!admin) {
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      }
      const otpRecord = await this.otpRepository.findOne({
        where: { user: admin, code: code },
      });
      if (!otpRecord) {
        throw new HttpException('Invalid OTP code', HttpStatus.BAD_REQUEST);
      }
      if (otpRecord.expires_at < new Date()) {
        await this.adminRepository.update(admin.id, { is_active: true });
        throw new HttpException(
          'OTP code has expired. Your account has been activated.',
          HttpStatus.BAD_REQUEST,
        );
      }
      admin.is_verified = true;
      await this.adminRepository.save(admin);
      await this.otpRepository.delete({ id: otpRecord.id });
      return { message: 'Admin account verified successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Internal server error',
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

  // Only for super admin to create other admins
  async blockAccountAdmin(adminId: number): Promise<{ message: string }> {
    try {
      const admin = await this.adminRepository.findOne({
        where: { id: adminId },
      });
      if (!admin) {
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      }
      await this.adminRepository.update(adminId, { is_active: true });

      // Add logic to send notification email to the admin about account status change
      await this.mailService.sendAccountStatusChangeEmail(
        admin.email,
        admin.username,
        false,
      );
      return { message: 'Admin account blocked successfully' };
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

  async blockAccountUser(userId: number): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      await this.userRepository.update(userId, { is_active: true });

      // Add logic to send notification email to the user about account status change
      await this.mailService.sendAccountStatusChangeEmail(
        user.email,
        user.username,
        false,
      );
      return { message: 'User account blocked successfully' };
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

  async getAllAdminAccounts(query: any): Promise<
    | {
        data: AdminResponseDto[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          nextPage: number | boolean;
          prevPage: number | boolean;
        };
      }
    | AdminResponseDto[]
  > {
    try {
      const { page = 1, limit = 10, sortBy = 'created_at', order = 'ASC' } = query;
      const admins = await this.adminRepository.find({
        where: { is_active: false },
      });
      const filteredAdmins = admins.filter(
        (admin) => admin.role !== AdminRole.SUPER_ADMIN,
      );
      // sort by allowed fields: username, created_at
      const allowed = new Set(['username', 'created_at']);
      const dir = String(order).toUpperCase() === 'ASC' ? 1 : -1;
      if (allowed.has(sortBy)) {
        filteredAdmins.sort((a, b) => {
          if (sortBy === 'username') {
            return (a.username || '').localeCompare(b.username || '') * dir;
          }
          // created_at
          const ta = a.created_at ? +new Date(a.created_at) : 0;
          const tb = b.created_at ? +new Date(b.created_at) : 0;
          return (ta - tb) * dir;
        });
      }
      const total = filteredAdmins.length;
      const totalPages = Math.ceil(total / limit);
      let startIndex = (page - 1) * limit;
      let endIndex = startIndex + limit;
      if (startIndex > total) {
        startIndex = (totalPages - 1) * limit;
        endIndex = total;
      }

      const nextPage = page < totalPages ? Number(page) + 1 : false;
      const prevPage = page > 1 ? Number(page) - 1 : false;

      return {
        data: filteredAdmins.slice(startIndex, endIndex).map((user) => ({
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
        })),
        pagination: {
          total: filteredAdmins.length,
          page: page,
          limit: limit,
          totalPages: totalPages,
          nextPage: nextPage,
          prevPage: prevPage,
        },
      };
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

  async getAllUserAccounts(query: any): Promise<
    | {
        data: UserResponseDto[];
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          nextPage: number | boolean;
          prevPage: number | boolean;
        };
      }
    | UserResponseDto[]
  > {
    try {
      const { page = 1, limit = 10, sortBy = 'created_at', order = 'ASC' } = query;
      const users = await this.userRepository.find({
        where: { is_active: false },
      });

      // sort by allowed fields: username, created_at
      const allowed = new Set(['username', 'created_at']);
      const dir = String(order).toUpperCase() === 'ASC' ? 1 : -1;
      if (allowed.has(sortBy)) {
        users.sort((a, b) => {
          if (sortBy === 'username') {
            return (a.username || '').localeCompare(b.username || '') * dir;
          }
          // created_at
          const ta = a.created_at ? +new Date(a.created_at) : 0;
          const tb = b.created_at ? +new Date(b.created_at) : 0;
          return (ta - tb) * dir;
        });
      }

      const total = users.length;
      const totalPages = Math.ceil(total / Number(limit));
      let startIndex = (Number(page) - 1) * Number(limit);
      let endIndex = startIndex + Number(limit);
      if (startIndex > total) {
        startIndex = (totalPages - 1) * Number(limit);
        endIndex = total;
      }

      const nextPage = Number(page) < totalPages ? Number(page) + 1 : false;
      const prevPage = Number(page) > 1 ? Number(page) - 1 : false;

      return {
        data: users.slice(startIndex, endIndex).map((user) => ({
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          avatar: user.avatar,
          gender: user.gender,
          day_of_birth: user.day_of_birth,
          email: user.email,
          phone_number: user.phone_number,
          created_at: user.created_at,
        })),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          nextPage,
          prevPage,
        },
      };
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
