import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminService } from '../admin.service';
import { Admin } from '../admin.entity';

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(
  Strategy,
  'jwt-admin-auth',
) {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: (req) => {
        let token = null;
        if (req && req.cookies) {
          token = req.cookies['access_token'];
        }
        return token;
      },
      ignoreExpiration: true,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any): Promise<Admin | null> {
    try {
      const { role } = payload;
      if (!role) {
        throw new HttpException(
          'You are not role admin. You can not access this resource',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const user = await this.adminService.validateUser(payload.username);
      if (!user) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
      return user;
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
}
