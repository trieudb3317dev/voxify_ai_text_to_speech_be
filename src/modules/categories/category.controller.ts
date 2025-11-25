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
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryDto, QueryCategoryDto } from './category.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from '../admin/guards/jwt-admin-auth.guard';
import { RoleGuard } from '../admin/guards/role.guard';
import { Roles } from '../admin/decorator/role.decorator';
import { Role } from '../type/role.enum';

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
  @Roles(Role.SUPPER_ADMIN, Role.ADMIN)
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
  @Roles(Role.SUPPER_ADMIN, Role.ADMIN)
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
  @Roles(Role.SUPPER_ADMIN, Role.ADMIN)
  async delete(@Param('id') id: number) {
    return await this.categoryService.delete(id);
  }
}
