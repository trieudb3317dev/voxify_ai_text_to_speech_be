import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogDto, QueryBlogDto, UpdateBlogDto } from './blog.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from '../admin/guards/jwt-admin-auth.guard';
import { Roles } from '../admin/decorator/role.decorator';
import { Role } from '../type/role.enum';
import { RoleGuard } from '../admin/guards/role.guard';

@Controller('blogs')
export class BlogController {
  // Implement blog controller methods here
  constructor(private readonly blogService: BlogService) {}

  @ApiOperation({
    summary: 'Get all blogs with pagination, search, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'List of blogs retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(@Query() query: QueryBlogDto) {
    return await this.blogService.findAll(query);
  }

  @ApiOperation({ summary: 'Get blog by ID' })
  @ApiResponse({
    status: 200,
    description: 'Blog retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Blog not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findById(@Param('id') id: number) {
    return await this.blogService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new blog' })
  @ApiResponse({
    status: 201,
    description: 'Blog created successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Blog with this title already exists.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @Roles(Role.SUPPER_ADMIN, Role.ADMIN)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  async createBlog(@Req() req: any, @Body() blogData: CreateBlogDto) {
    // Implement create blog logic here
    return await this.blogService.create(blogData, req.user);
  }

  @ApiOperation({ summary: 'Update a blog' })
  @ApiResponse({
    status: 200,
    description: 'Blog updated successfully.',
  })
  @ApiResponse({ status: 404, description: 'Blog not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  @Roles(Role.SUPPER_ADMIN, Role.ADMIN)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  async updateBlog(@Param('id') id: number, @Body() blogData: UpdateBlogDto) {
    // Implement update blog logic here
    return await this.blogService.update(id, blogData);
  }

  @ApiOperation({ summary: 'Delete a blog' })
  @ApiResponse({
    status: 200,
    description: 'Blog deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'Blog not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @Roles(Role.SUPPER_ADMIN, Role.ADMIN)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  async deleteBlog(@Param('id') id: number) {
    // Implement delete blog logic here
    return await this.blogService.delete(id);
  }
}
