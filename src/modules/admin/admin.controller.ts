import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
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
import { Roles } from './decorator/role.decorator';
import { Role } from '../type/role.enum';

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

  @ApiOperation({ summary: 'Verify admin account' })
  @ApiResponse({ status: 200, description: 'Admin account verified successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.OK)
  @Post('verify-account')
  async verifyAccount(
    @Body('username') username: string,
    @Body('code') code: string,
  ) {
    return this.adminService.verifyAdminAccount(username, code);
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

  // Only super admins can access this route
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({ status: 200, description: 'Admins retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.OK)
  @Get('admins')
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  async getAllAdmins(@Query() query: any) {
    // Implementation for retrieving all admins
    return this.adminService.getAllAdminAccounts(query);
  }

  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiResponse({ status: 200, description: 'Admin retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.OK)
  @Get('users')
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  async getAllUsers(@Query() query: any) {
    return this.adminService.getAllUserAccounts(query);
  }

  // Block or unblock an admin - only super admins can perform this action
  @ApiOperation({ summary: 'Block or unblock an admin' })
  @ApiResponse({
    status: 200,
    description: 'Admin status updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.OK)
  @Put('status/:adminId')
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  async blockUnblockAdmin(@Param('adminId') adminId: string) {
    // Implementation for blocking or unblocking an admin
    const id = parseInt(adminId, 10);
    return this.adminService.blockAccountAdmin(id);
  }

  @ApiOperation({ summary: 'Block or unblock a user' })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @HttpCode(HttpStatus.OK)
  @Put('user/status/:userId')
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  async blockUnblockUser(@Param('userId') userId: string) {
    const id = parseInt(userId, 10);
    return this.adminService.blockAccountUser(id);
  }
}
