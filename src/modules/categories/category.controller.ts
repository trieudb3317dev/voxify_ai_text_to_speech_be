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
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryDto, QueryCategoryDto } from './category.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from '../admin/guards/jwt-admin-auth.guard';
import { RoleGuard } from '../admin/guards/role.guard';
import { Roles } from '../admin/decorator/role.decorator';
import { Role } from '../type/role.enum';
import * as path from 'path';
import * as fs from 'fs';

@Controller('categories')
export class CategoryController {
  // Implement category controller methods here
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Category with this name already exists.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  async createCategory(@Body() cateDto: CategoryDto) {
    return await this.categoryService.create(cateDto);
  }

  @ApiOperation({ summary: 'Get all categories with pagination and search' })
  @ApiResponse({
    status: 200,
    description: 'List of categories retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryCategoryDto) {
    return await this.categoryService.findAll(query);
  }

  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: number) {
    // Implement find one category by ID
    return await this.categoryService.findById(id);
  }

  @ApiOperation({ summary: 'Update category by ID' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Category with this name already exists.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  async update(@Param('id') id: number, @Body() cateDto: CategoryDto) {
    return await this.categoryService.update(id, cateDto);
  }

  @ApiOperation({ summary: 'Delete category by ID' })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  async delete(@Param('id') id: number) {
    return await this.categoryService.delete(id);
  }

  /**
   * Import categories from CSV file
   */
  @ApiOperation({ summary: 'Import categories from CSV file' })
  @ApiResponse({
    status: 200,
    description: 'Categories imported successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @Post('import/csv')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  async importCategoriesFromCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return await this.categoryService.importCategoriesFromCSV();
    }
    // If multer stores file on disk, file.path is available
    let filePathToPass: string | undefined = (file as any).path;

    // If multer used memory storage, write buffer to tmp and pass that path
    if (!filePathToPass && (file as any).buffer) {
      const tmpDir = path.join(process.cwd(), 'tmp');
      fs.mkdirSync(tmpDir, { recursive: true });
      const filename = `import_${Date.now()}_${(file.originalname || 'upload').replace(/\s+/g, '_')}`;
      const fp = path.join(tmpDir, filename);
      fs.writeFileSync(fp, (file as any).buffer);
      filePathToPass = fp;
    }
    return await this.categoryService.importCategoriesFromCSV(filePathToPass);
  }

  /**
   * Export categories to CSV file
   */
  @ApiOperation({ summary: 'Export categories to CSV file' })
  @ApiResponse({
    status: 200,
    description: 'Categories exported successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @Get('export/csv')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  async exportCategoriesToCSV() {
    return await this.categoryService.exportCategoriesToCSV();
  }
}
