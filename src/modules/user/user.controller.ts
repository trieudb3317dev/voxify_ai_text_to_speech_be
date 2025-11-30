import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './user.dto';

@Controller('users')
export class UserController {
  // Implement user controller methods here
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile fetched successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @UseGuards(JwtAuthGuard)
  async profile(@Req() req: any) {
    return await this.userService.profile(req.user);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Body() updatedData: UpdateUserDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    /* Implement logic to update user profiles */
    return await this.userService.updateProfile(userId, updatedData);
  }
}
