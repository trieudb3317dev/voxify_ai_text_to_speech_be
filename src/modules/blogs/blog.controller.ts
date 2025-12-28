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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogDto, QueryBlogDto, UpdateBlogDto } from './blog.dto';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from '../admin/guards/jwt-admin-auth.guard';
import { Roles } from '../admin/decorator/role.decorator';
import { Role } from '../type/role.enum';
import { RoleGuard } from '../admin/guards/role.guard';
import * as path from 'path';
import * as fs from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

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

  @ApiOperation({ summary: 'List blogs created by a specific admin' })
  @ApiResponse({
    status: 200,
    description: 'List of blogs by admin retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Admin not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Get('by-created')
  async findByAdmin(@Req() req: any, @Query() query: QueryBlogDto) {
    const createdById = req.user.id;
    return await this.blogService.findAllByCreated(query, createdById);
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  async deleteBlog(@Param('id') id: number) {
    // Implement delete blog logic here
    return await this.blogService.delete(id);
  }

  /**
   * Import blogs from CSV file
   */
  @ApiOperation({ summary: 'Import blogs from CSV file' })
  @ApiResponse({
    status: 200,
    description: 'Blogs imported successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('import/csv')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async importBlogsFromCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return await this.blogService.importBlogsFromCSV();
    }
    // If multer stores file on disk, file.path is available
    let filePathToPass: string | undefined = (file as any).path;

    // If multer used memory storage, write buffer to tmp and pass that path
    if (!filePathToPass && (file as any).buffer) {
      const tmpDir = path.join(process.cwd(), process.env.TMP_DIR || 'tmp');
      fs.mkdirSync(tmpDir, { recursive: true });
      const filename = `import_${Date.now()}_${(file.originalname || 'upload').replace(/\s+/g, '_')}`;
      const fp = path.join(tmpDir, filename);
      fs.writeFileSync(fp, (file as any).buffer);
      filePathToPass = fp;
    }
    return await this.blogService.importBlogsFromCSV(filePathToPass);
  }

  /**
   * Export blogs to CSV file
   */
  @ApiOperation({ summary: 'Export blogs to CSV file' })
  @ApiResponse({
    status: 200,
    description: 'Blogs exported successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @Get('export/csv')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  async exportBlogsToCSV() {
    return await this.blogService.exportBlogsToCSV();
  }
}
