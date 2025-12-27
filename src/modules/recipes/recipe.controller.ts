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
import { RecipeService } from './recipe.service';
import {
  QueryRecipeDto,
  RecipeDetailDto,
  RecipeDto,
  RecipeUpdateDto,
} from './recipe.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from '../admin/guards/jwt-admin-auth.guard';
import { RoleGuard } from '../admin/guards/role.guard';
import { Roles } from '../admin/decorator/role.decorator';
import { Role } from '../type/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recipes')
export class RecipeController {
  // Implement recipe controller methods here
  constructor(private readonly recipeService: RecipeService) {}

  @ApiOperation({
    summary: 'Get all recipes with pagination, search, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'List of recipes retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(@Query() query: QueryRecipeDto) {
    return await this.recipeService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get all recipes created by the authenticated admin',
  })
  @ApiResponse({
    status: 200,
    description: 'List of recipes created by the admin retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Admin not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Get('created-by')
  @UseGuards(JwtAdminAuthGuard)
  async findAllByCreated(@Query() query: QueryRecipeDto, @Req() req) {
    return await this.recipeService.findAllByCreated(query, req.user.id);
  }

  /**
   * Get all recipes full details
   */
  @ApiOperation({
    summary:
      'Get all recipes with full details, pagination, search, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'List of recipes with full details retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Get('full-details')
  async findAllFullDetail(@Query() query: QueryRecipeDto) {
    return await this.recipeService.findAllFullDetail(query);
  }

  @ApiOperation({ summary: 'Get recipe by ID' })
  @ApiResponse({
    status: 200,
    description: 'Recipe retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Recipe not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.recipeService.findById(id);
  }

  /**
   * Get recipe details by recipe ID
   */
  @ApiOperation({ summary: 'Get recipe details by recipe ID' })
  @ApiResponse({
    status: 200,
    description: 'Recipe details retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Recipe not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/details')
  async findDetails(@Param('id') id: number) {
    return await this.recipeService.getRecipeDetails(id);
  }

  @ApiOperation({ summary: 'Create a new recipe' })
  @ApiResponse({
    status: 201,
    description: 'Recipe created successfully.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Recipe with this title already exists.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  // Additional methods for creating, updating, and deleting recipes can be added here
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  async create(@Body() recipeDto: RecipeDto<RecipeDetailDto>, @Req() req) {
    // Implementation for creating a recipe
    return await this.recipeService.create(recipeDto, req.user);
  }

  @ApiOperation({ summary: 'Update an existing recipe by ID' })
  @ApiResponse({
    status: 200,
    description: 'Recipe updated successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Recipe not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  async update(
    @Param('id') id: number,
    @Body() recipeData: RecipeUpdateDto,
  ): Promise<{ message: string }> {
    return await this.recipeService.update(id, recipeData);
  }

  /**
   * Update recipe details by recipe ID
   */
  @ApiOperation({ summary: 'Update recipe details by recipe ID' })
  @ApiResponse({
    status: 200,
    description: 'Recipe details updated successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Recipe not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Put(':id/details')
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  async updateDetails(
    @Param('id') id: number,
    @Body() recipeDetailData: RecipeDetailDto,
  ): Promise<{ message: string }> {
    return await this.recipeService.updateRecipeDetails(id, recipeDetailData);
  }

  @ApiOperation({ summary: 'Delete a recipe by ID' })
  @ApiResponse({
    status: 200,
    description: 'Recipe deleted successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Recipe not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @UseGuards(JwtAdminAuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.EDITOR)
  async delete(@Param('id') id: number) {
    return await this.recipeService.delete(id);
  }

  /**
   * Toggle favorite status of a recipe for a user
   */
  @ApiOperation({ summary: 'Add or remove a recipe from user favorites' })
  @ApiResponse({
    status: 200,
    description: 'Recipe favorite status toggled successfully.',
  })
  @ApiResponse({ status: 404, description: 'User or Recipe not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/add-to-favorites')
  @UseGuards(JwtAuthGuard)
  async toggleFavorite(
    @Param('id') recipeId: number,
    @Req() req,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    return await this.recipeService.addToFavorites(userId, recipeId);
  }

  @ApiOperation({ summary: 'Remove a recipe from user favorites' })
  @ApiResponse({
    status: 200,
    description: 'Recipe removed from favorites successfully.',
  })
  @ApiResponse({ status: 404, description: 'User or Recipe not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/remove-from-favorites')
  @UseGuards(JwtAuthGuard)
  async removeFromFavorites(
    @Param('id') recipeId: number,
    @Req() req,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    return await this.recipeService.removeFromFavorites(userId, recipeId);
  }

  /**
   * Get all favorite recipes of a user
   */
  @ApiOperation({
    summary: 'Get all favorite recipes of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of favorite recipes retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Get('favorites/user')
  @UseGuards(JwtAuthGuard)
  async getUserFavorites(@Req() req, @Query() query: QueryRecipeDto) {
    const userId = req.user.id;
    return await this.recipeService.getUserFavorites(userId, query);
  }

  /**
   * Check if a recipe is in user's favorites
   */
  @ApiOperation({ summary: 'Check if a recipe is in user favorites' })
  @ApiResponse({
    status: 200,
    description: 'Favorite status retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/is-favorite')
  @UseGuards(JwtAuthGuard)
  async isFavorite(@Param('id') recipeId: number, @Req() req) {
    const userId = req.user.id;
    return await this.recipeService.isRecipeInFavorites(userId, recipeId);
  }
}
