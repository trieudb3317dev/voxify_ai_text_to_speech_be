import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto, CreateAdminDto, UpdateAdminDto } from './admin.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAdminAuthGuard } from './guards/jwt-admin-auth.guard';
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
  @Get('/me')
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  async profile(@Req() req: any) {
    // Implementation for retrieving admin profile
    const userId = req.user.id;
    return this.adminService.profile(userId);
  }

  @ApiOperation({ summary: 'Update admin profile' })
  @ApiResponse({
    status: 200,
    description: 'Admin profile updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.OK)
  @Put()
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  async updateProfile(@Body() updatedData: UpdateAdminDto, @Req() req: any) {
    // Implementation for updating admin profile
    const userId = req.user.id;
    return this.adminService.updateProfile(userId, updatedData);
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
