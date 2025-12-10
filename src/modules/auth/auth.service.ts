import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Otp } from '../otp/otp.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, PayloadDto, UserLoginDto } from '../user/user.dto';
import e, { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/shared/mail/mail.service';

@Injectable()
export class AuthService {
  // Implement authentication service methods here
  protected readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: CreateUserDto): Promise<{ message: string }> {
    try {
      const salt = 10;
      const existingUser = await this.userRepository.findOne({
        where: { username: registerDto.username },
      });
      if (existingUser) {
        throw new HttpException(
          'Username already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      const hasPassword = bcrypt.hashSync(registerDto.password, salt);
      const newUser = this.userRepository.create({
        username: registerDto.username,
        email: registerDto.email,
        password: hasPassword,
      });
      await this.userRepository.save(newUser);
      return { message: 'Registration successful' };
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(
          `Registration failed for user ${registerDto.username}: ${error.message}`,
        );
        throw error;
      }
      this.logger.error(
        `Registration failed for user ${registerDto.username}: ${error.message}`,
      );
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async login(
    loginDto: UserLoginDto,
    response: Response,
  ): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { username: loginDto.username },
      });
      if (!user) {
        throw new HttpException(
          `Coundn't find user into system: ${loginDto.username}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const passwordIsValid = user
        ? bcrypt.compareSync(loginDto.password, user.password)
        : false;
      if (!user || !passwordIsValid) {
        throw new HttpException(
          'Invalid username or password',
          HttpStatus.BAD_REQUEST,
        );
      }
      const payload: PayloadDto = { username: user.username, id: user.id };
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

  async refreshToken(
    refreshToken: string,
    response: Response,
  ): Promise<{ message: string }> {
    try {
      if (!refreshToken) {
        throw new HttpException(
          'Refresh token is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const decodedToken = this.jwtService.decode(refreshToken);
      const { username } = decodedToken as any;
      const user = await this.userRepository.findOne({
        where: { username },
      });
      if (!user) {
        throw new HttpException(
          'Invalid refresh token',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const payload: PayloadDto = { username: user.username, id: user.id };
      this.generateAccessToken(payload, response);
      this.generateRefreshToken(payload, response);
      return { message: 'Refresh token generated successfully' };
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

  async sendOtp(email: string): Promise<{ message: string }> {
    try {
      // Implement forgot password logic here
      const existingUser = await this.userRepository.findOne({
        where: { email: email },
      });
      if (!existingUser) {
        throw new HttpException('Email not found', HttpStatus.NOT_FOUND);
      }
      const otpCode = await this.generateOtp();
      const newOtp = this.otpRepository.create({
        code: otpCode,
        expires_at: new Date(Date.now() + 3 * 60 * 1000),
        user: existingUser,
      });
      await this.otpRepository.save(newOtp);
      // TODO: Send OTP to user's email
      await this.mailService.sendEmail({
        to: email,
        subject: 'Your OTP Code',
        html: `
                        div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">Account Registration Verification Code</h2>
                            <p>Hello,</p>
                            <p>You have requested to register an account with email: <strong>${email}</strong></p>
                            <p>Your verification code is:</p>
                            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                                <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otpCode}</h1>
                            </div>
                            <p>This code is valid for ${3} minutes. Please do not share this code with anyone.</p>
                            <p>If you did not request to register an account, please ignore this email.</p>
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 12px;">This is an automated email, please do not reply.</p>
                        </div>
                `,
        text: `Your OTP code is: ${otpCode}. This code will expire in 3 minutes.`,
      });
      // You can integrate an email service here to send the OTP to the user's email address
      return { message: 'OTP sent to your email' };
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(
          `Forgot password failed for email ${email}: ${error.message}`,
        );
        throw error;
      }
      this.logger.error(
        `Forgot password failed for email ${email}: ${error.message}`,
      );
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resetPassword(
    resetToken: string,
    newPassword: string,
    otp: string,
  ): Promise<{ message: string }> {
    try {
      // Implement reset password logic here
      if (!resetToken) {
        throw new HttpException(
          'Reset token is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const existingOtp = await this.otpRepository.findOne({
        where: { code: otp },
        relations: ['user'],
      });
      if (!existingOtp || existingOtp.expires_at < new Date()) {
        throw new HttpException(
          'Invalid or expired OTP',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        existingOtp.user.id !== (this.jwtService.decode(resetToken) as any).sub
      ) {
        throw new HttpException(
          'OTP does not match the user',
          HttpStatus.BAD_REQUEST,
        );
      }
      const decodedToken = this.jwtService.decode(resetToken);
      const { username } = decodedToken as any;
      const existingUser = await this.userRepository.findOne({
        where: { username: username },
      });
      if (!existingUser) {
        throw new HttpException('Invalid reset token', HttpStatus.BAD_REQUEST);
      }

      existingUser.password = bcrypt.hashSync(newPassword, 10);
      await this.userRepository.save(existingUser);
      return { message: 'Password reset successful' };
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(`Reset password failed: ${error.message}`);
        throw error;
      }
      this.logger.error(`Reset password failed: ${error.message}`);
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
        sameSite: 'lax',
      });
      response.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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

  async validateUser(username: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
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

  private generateAccessToken(user: PayloadDto, response: Response): string {
    const payload = { username: user.username, sub: user.id };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return token;
  }

  private async generateRefreshToken(
    user: PayloadDto,
    response: Response,
  ): Promise<string> {
    const payload = { username: user.username, sub: user.id };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
    response.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
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
