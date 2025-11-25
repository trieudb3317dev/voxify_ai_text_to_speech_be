import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto, CreateAdminDto } from './admin.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAdminAuthGuard } from './guards/jwt-admin-auth.guard';
import { Role } from '../type/role.enum';
import { Roles } from './decorator/role.decorator';
import { RoleGuard } from './guards/role.guard';

@Controller('admin')
export class AdminController {
  // Implement admin controller methods here
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Register a new admin' })
  @ApiResponse({ status: 201, description: 'Admin registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() createAdminDto: CreateAdminDto) {
    // Implementation for creating an admin
    await this.adminService.create(createAdminDto);
  }

  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Admin logged in successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Implementation for admin login
    return this.adminService.login(loginDto, response);
  }

  @ApiOperation({ summary: 'Get admin profile' })
  @ApiResponse({
    status: 200,
    description: 'Admin profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.OK)
  @Get('/:id/profile')
  @Roles(Role.SUPPER_ADMIN, Role.ADMIN)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  async profile(@Param('id') id: number) {
    // Implementation for retrieving admin profile
    return this.adminService.profile(id);
  }

  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Admin logged out successfully' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    // Implementation for admin logout
    return this.adminService.logout(response);
  }
}
