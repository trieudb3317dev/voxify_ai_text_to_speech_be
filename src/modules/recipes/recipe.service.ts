import {
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Recipe } from './recipe.entity';
import { Repository } from 'typeorm';
import {
  QueryRecipeDto,
  RecipeDetailDto,
  RecipeDto,
  RecipeListResponse,
  RecipeUpdateDto,
} from './recipe.dto';
import { RecipeDetail } from './recipe-detail.entity';
import { Category } from '../categories/category.entity';
import { User } from '../user/user.entity';
import { Admin } from '../admin/admin.entity';
import { Wishlist } from 'src/whistlist/whistlist.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RecipeService {
  // Implement recipe service methods here
  private readonly logger = new Logger(RecipeService.name);
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeDetail)
    private readonly recipeDetailRepository: Repository<RecipeDetail>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async findAll(query: QueryRecipeDto): Promise<RecipeListResponse<any>> {
    try {
      const { page = 1, limit = 10, search, sortBy, order } = query;
      const qb = this.recipeRepository
        .createQueryBuilder('recipe')
        .leftJoin('recipe.category', 'category')
        .leftJoin('recipe.admin', 'admin')
        .where('recipe.is_active = :isActive', { isActive: false })
        .select([
          'recipe.id',
          'recipe.title',
          'recipe.slug',
          'recipe.image_url',
          'category.id',
          'category.name',
          'admin.id',
          'admin.username',
          'admin.role',
        ]);

      // Apply sorting
      if (sortBy && order) {
        qb.orderBy(`recipe.${sortBy}`, order);
      }

      if (search) {
        qb.andWhere('LOWER(recipe.title) LIKE :title', {
          title: `%${String(search).toLowerCase()}%`,
        });
      }

      const [recipes, total] = await qb
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      const totalPages = Math.ceil(total / Number(limit));
      const nextPage = Number(page) < totalPages ? Number(page) + 1 : false;
      const prevPage = Number(page) > 1 ? Number(page) - 1 : false;

      if (!recipes.length) {
        return {
          data: [],
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            nextPage,
            prevPage,
          },
        };
      }

      // ----- NEW: load detail fields for returned recipes -----
      const recipeIds = recipes.map((r) => r.id);
      const detailRows = await this.recipeDetailRepository
        .createQueryBuilder('detail')
        .where('detail.recipe_id IN (:...ids)', { ids: recipeIds })
        .andWhere('detail.is_active = :isActive', { isActive: false })
        .select([
          'detail.recipe_id as recipe_id',
          'detail.recipe_video as recipe_video',
          'detail.time_preparation as time_preparation',
          'detail.time_cooking as time_cooking',
          'detail.recipe_type as recipe_type',
        ])
        .getRawMany();

      const detailMap: Record<number, any> = {};
      detailRows.forEach((d) => {
        detailMap[Number(d.recipe_id)] = {
          recipe_video: d.recipe_video,
          time_preparation: d.time_preparation,
          time_cooking: d.time_cooking,
          recipe_type: d.recipe_type,
        };
      });

      // Attach detail to each recipe
      const recipesWithDetail = recipes.map((r) => ({
        ...r,
        detail: detailMap[r.id] || null,
      }));
      // ----- END NEW -----

      return {
        data: recipesWithDetail,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          nextPage,
          prevPage,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllByCreated(
    query: QueryRecipeDto,
    userId: number,
  ): Promise<RecipeListResponse<any>> {
    try {
      const { page = 1, limit = 10, search, sortBy, order } = query;
      const createdBy = await this.adminRepository.findOne({
        where: { id: userId },
      });
      if (!createdBy) {
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      }
      const qb = this.recipeRepository
        .createQueryBuilder('recipe')
        .leftJoin('recipe.category', 'category')
        .leftJoin('recipe.admin', 'admin')
        .where('recipe.is_active = :isActive', { isActive: false })
        .andWhere('recipe.admin_id = :adminId', { adminId: createdBy.id })
        .select([
          'recipe.id',
          'recipe.title',
          'recipe.slug',
          'recipe.image_url',
          'category.id',
          'category.name',
          'admin.id',
          'admin.username',
          'admin.role',
        ]);

      // Apply sorting
      if (sortBy && order) {
        qb.orderBy(`recipe.${sortBy}`, order);
      }

      if (search) {
        qb.andWhere('LOWER(recipe.title) LIKE :title', {
          title: `%${String(search).toLowerCase()}%`,
        });
      }

      const [recipes, total] = await qb
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      const totalPages = Math.ceil(total / Number(limit));
      const nextPage = Number(page) < totalPages ? Number(page) + 1 : false;
      const prevPage = Number(page) > 1 ? Number(page) - 1 : false;

      if (!recipes.length) {
        return {
          data: [],
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            nextPage,
            prevPage,
          },
        };
      }

      // ----- NEW: load detail fields for returned recipes -----
      const recipeIds = recipes.map((r) => r.id);
      const detailRows = await this.recipeDetailRepository
        .createQueryBuilder('detail')
        .where('detail.recipe_id IN (:...ids)', { ids: recipeIds })
        .andWhere('detail.is_active = :isActive', { isActive: false })
        .select([
          'detail.recipe_id as recipe_id',
          'detail.recipe_video as recipe_video',
          'detail.time_preparation as time_preparation',
          'detail.time_cooking as time_cooking',
          'detail.recipe_type as recipe_type',
        ])
        .getRawMany();

      const detailMap: Record<number, any> = {};
      detailRows.forEach((d) => {
        detailMap[Number(d.recipe_id)] = {
          recipe_video: d.recipe_video,
          time_preparation: d.time_preparation,
          time_cooking: d.time_cooking,
          recipe_type: d.recipe_type,
        };
      });

      // Attach detail to each recipe
      const recipesWithDetail = recipes.map((r) => ({
        ...r,
        detail: detailMap[r.id] || null,
      }));
      // ----- END NEW -----

      return {
        data: recipesWithDetail,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          nextPage,
          prevPage,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all recipes full details
   */

  async findAllFullDetail(
    query: QueryRecipeDto,
  ): Promise<RecipeListResponse<any>> {
    try {
      const { page = 1, limit = 10, search, sortBy, order } = query;
      const qb = this.recipeRepository
        .createQueryBuilder('recipe')
        .leftJoin('recipe.category', 'category')
        .leftJoin('recipe.admin', 'admin')
        .where('recipe.is_active = :isActive', { isActive: false })
        .select([
          'recipe.id',
          'recipe.title',
          'recipe.slug',
          'recipe.image_url',
          'category.id',
          'category.name',
          'admin.id',
          'admin.username',
          'admin.role',
        ]);

      // Apply sorting
      if (sortBy && order) {
        qb.orderBy(`recipe.${sortBy}`, order);
      }

      if (search) {
        qb.andWhere('LOWER(recipe.title) LIKE :title', {
          title: `%${String(search).toLowerCase()}%`,
        });
      }

      const [recipes, total] = await qb
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      const totalPages = Math.ceil(total / Number(limit));
      const nextPage = Number(page) < totalPages ? Number(page) + 1 : false;
      const prevPage = Number(page) > 1 ? Number(page) - 1 : false;

      if (!recipes.length) {
        return {
          data: [],
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            nextPage,
            prevPage,
          },
        };
      }

      // ----- NEW: load detail fields for returned recipes -----
      const recipeIds = recipes.map((r) => r.id);
      const detailRows = await this.recipeDetailRepository
        .createQueryBuilder('detail')
        .where('detail.recipe_id IN (:...ids)', { ids: recipeIds })
        .andWhere('detail.is_active = :isActive', { isActive: false })
        .select([
          'detail.recipe_id as recipe_id',
          'detail.recipe_video as recipe_video',
          'detail.time_preparation as time_preparation',
          'detail.time_cooking as time_cooking',
          'detail.recipe_type as recipe_type',
          'detail.ingredients as ingredients',
          'detail.steps as steps',
          'detail.nutrition_info as nutrition_info',
          'detail.notes as notes',
          'detail.nutrition_facts as nutrition_facts',
        ])
        .getRawMany();

      const detailMap: Record<number, any> = {};
      detailRows.forEach((d) => {
        detailMap[Number(d.recipe_id)] = {
          recipe_video: d.recipe_video,
          time_preparation: d.time_preparation,
          time_cooking: d.time_cooking,
          recipe_type: d.recipe_type,
          ingredients: d.ingredients,
          steps: d.steps,
          nutrition_info: d.nutrition_info,
          notes: d.notes,
          nutrition_facts: d.nutrition_facts,
        };
      });

      // Attach detail to each recipe
      const recipesWithDetail = recipes.map((r) => ({
        ...r,
        detail: detailMap[r.id] || null,
      }));
      // ----- END NEW -----

      return {
        data: recipesWithDetail,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          nextPage,
          prevPage,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findById(id: number): Promise<Recipe | null> {
    try {
      const recipe = await this.recipeRepository
        .createQueryBuilder('recipe')
        .leftJoin('recipe.category', 'category')
        .leftJoin('recipe.admin', 'admin')
        .select([
          'recipe.id',
          'recipe.title',
          'recipe.slug',
          'recipe.image_url',
          'category.id',
          'category.name',
          'admin.id',
          'admin.username',
          'admin.role',
        ])
        .where('recipe.id = :id', { id })
        .andWhere('recipe.is_active = :isActive', { isActive: false })
        .getOne();

      if (!recipe) {
        throw new HttpException('Recipe not found', HttpStatus.NOT_FOUND);
      }
      return recipe;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get recipe details by recipe ID
   */
  async getRecipeDetails(recipeId: number): Promise<RecipeDetail | null> {
    try {
      const recipeDetail = await this.recipeDetailRepository
        .createQueryBuilder('recipeDetail')
        .leftJoinAndSelect('recipeDetail.recipe', 'recipe')
        .where('recipeDetail.recipe = :recipeId', { recipeId })
        .andWhere('recipeDetail.is_active = :isActive', { isActive: false })
        .select([
          'recipeDetail.id',
          'recipeDetail.recipe_video',
          'recipeDetail.time_preparation',
          'recipeDetail.time_cooking',
          'recipeDetail.recipe_type',
          'recipeDetail.ingredients',
          'recipeDetail.steps',
          'recipeDetail.nutrition_info',
          'recipeDetail.notes',
          'recipeDetail.nutrition_facts',
        ])
        .getOne();

      if (!recipeDetail) {
        throw new HttpException('Recipe not found', HttpStatus.NOT_FOUND);
      }
      return recipeDetail;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(
    recipeData: RecipeDto<RecipeDetailDto>,
    req: any,
  ): Promise<{ message: string }> {
    try {
      const { title, image_url, description, category_id, detail } = recipeData;

      if (!req || !req.id) {
        throw new HttpException(
          'You are not authorized',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const slug = title
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

      const existingUser = await this.adminRepository.findOne({
        where: { id: req.id, is_active: false },
      });
      if (!existingUser) {
        throw new HttpException('You are not admin', HttpStatus.NOT_FOUND);
      }
      const existingRecipe = await this.recipeRepository.findOne({
        where: { title: title, is_active: false },
      });
      if (existingRecipe) {
        throw new HttpException(
          'Recipe with this title already exists',
          HttpStatus.CONFLICT,
        );
      }
      if (!detail) {
        throw new HttpException(
          'Recipe detail is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const {
        ingredients,
        instructions,
        nutrition_info,
        notes,
        recipe_video,
        time_preparation,
        time_cooking,
        recipe_type,
        nutrition_facts,
      } = detail;
      // Implement recipe creation logic here

      const category = await this.categoryRepository.findOne({
        where: { id: category_id, is_active: false },
      });

      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }

      const newRecipe = this.recipeRepository.create({
        title,
        slug,
        image_url,
        description,
        category,
        admin: req.id ?? existingUser, // Assign the user appropriately
      });
      await this.recipeRepository.save(newRecipe);

      if (!newRecipe) {
        throw new HttpException(
          'Failed to create recipe',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const recipeDetail = this.recipeDetailRepository.create({
        recipe: newRecipe,
        ingredients,
        steps: instructions,
        nutrition_info,
        notes,
        recipe_video,
        time_preparation,
        time_cooking,
        recipe_type,
        nutrition_facts,
      });
      await this.recipeDetailRepository.save(recipeDetail);

      await this.categoryRepository
        .createQueryBuilder()
        .relation(Category, 'recipes')
        .of(category)
        .add(newRecipe);

      return { message: 'Recipe created successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Internal server error: ${error.message}`, error.stack);
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: number,
    recipeData: RecipeUpdateDto,
  ): Promise<{ message: string }> {
    try {
      // Implement recipe update logic here
      const { title, image_url, description } = recipeData;

      const slug = title
        ?.toLowerCase()
        ?.replace(/ /g, '-')
        ?.replace(/[^\w-]+/g, '');

      const existingRecipe = await this.recipeRepository.findOne({
        where: { id, is_active: false },
      });
      if (!existingRecipe) {
        throw new HttpException('Recipe not found', HttpStatus.NOT_FOUND);
      }

      await this.recipeRepository.update(id, {
        title: title,
        slug: slug,
        image_url: image_url,
        description: description,
      });

      return { message: 'Recipe updated successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update recipe details by recipe ID
   */
  async updateRecipeDetails(
    recipeId: number,
    detailData: RecipeDetailDto,
  ): Promise<{ message: string }> {
    try {
      // Implement recipe detail update logic here
      const existingRecipeDetail = await this.recipeDetailRepository.findOne({
        where: { recipe: { id: recipeId }, is_active: false },
      });
      if (!existingRecipeDetail) {
        throw new HttpException('Recipe not found', HttpStatus.NOT_FOUND);
      }
      await this.recipeDetailRepository.update(
        { recipe: { id: recipeId } },
        {
          recipe_video: detailData.recipe_video,
          time_preparation: detailData.time_preparation,
          time_cooking: detailData.time_cooking,
          recipe_type: detailData.recipe_type,
          ingredients: detailData.ingredients,
          steps: detailData.instructions,
          nutrition_info: detailData.nutrition_info,
          notes: detailData.notes,
          nutrition_facts: detailData.nutrition_facts,
        },
      );
      return { message: 'Recipe details updated successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(id: number): Promise<{ message: string }> {
    try {
      const recipe = await this.recipeRepository.findOne({
        where: { id, is_active: false },
      });
      if (!recipe) {
        throw new HttpException('Recipe not found', HttpStatus.NOT_FOUND);
      }
      await this.recipeRepository.update(id, { is_active: true });
      await this.recipeDetailRepository
        .createQueryBuilder()
        .update(RecipeDetail)
        .set({ is_active: true })
        .where('recipeId = :recipeId', { recipeId: id })
        .execute();

      await this.categoryRepository
        .createQueryBuilder()
        .relation(Recipe, 'category')
        .of(id)
        .remove(recipe.category);

      return { message: 'Recipe deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add recipe to user's favorites
   */

  async addToFavorites(
    userId: number,
    recipeId: number,
  ): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, is_active: false },
        relations: ['wishlists'],
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const recipe = await this.recipeRepository.findOne({
        where: { id: recipeId, is_active: false },
        relations: ['wishlists'],
      });

      if (!recipe) {
        throw new HttpException('Recipe not found', HttpStatus.NOT_FOUND);
      }

      const favoriteRecipe = await this.wishlistRepository
        .createQueryBuilder('wishlist')
        .leftJoinAndSelect('wishlist.users', 'users')
        .leftJoinAndSelect('wishlist.recipes', 'recipes')
        .where('users.id = :userId and recipes.id = :recipeId', {
          userId,
          recipeId,
        })
        .getOne();

      if (favoriteRecipe) {
        throw new HttpException(
          'Recipe already in favorites',
          HttpStatus.CONFLICT,
        );
      }

      const newWishlistEntry = this.wishlistRepository.create({
        users: user,
        recipes: recipe,
      });
      await this.wishlistRepository.save(newWishlistEntry);

      await this.userRepository
        .createQueryBuilder()
        .relation(User, 'wishlists')
        .of(user)
        .add(newWishlistEntry);

      await this.recipeRepository
        .createQueryBuilder()
        .relation(Recipe, 'wishlists')
        .of(recipe)
        .add(newWishlistEntry);

      return { message: 'Recipe added to favorites successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  /**
   * Remove recipe from user's favorites
   */
  async removeFromFavorites(
    userId: number,
    recipeId: number,
  ): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, is_active: false },
        relations: ['wishlists'],
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const recipe = await this.recipeRepository.findOne({
        where: { id: recipeId, is_active: false },
        relations: ['wishlists'],
      });

      if (!recipe) {
        throw new HttpException('Recipe not found', HttpStatus.NOT_FOUND);
      }

      const favoriteRecipe = await this.wishlistRepository
        .createQueryBuilder('wishlist')
        .leftJoinAndSelect('wishlist.users', 'users')
        .leftJoinAndSelect('wishlist.recipes', 'recipes')
        .where('users.id = :userId and recipes.id = :recipeId', {
          userId,
          recipeId,
        })
        .getOne();

      if (!favoriteRecipe) {
        throw new HttpException(
          'Recipe not in favorites',
          HttpStatus.NOT_FOUND,
        );
      }

      await this.wishlistRepository.remove(favoriteRecipe);

      await this.userRepository
        .createQueryBuilder()
        .relation(User, 'wishlists')
        .of(user)
        .remove(favoriteRecipe);

      await this.recipeRepository
        .createQueryBuilder()
        .relation(Recipe, 'wishlists')
        .of(recipe)
        .remove(favoriteRecipe);

      return { message: 'Recipe removed from favorites successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user's favorite recipes (supports pagination, search, sort)
   */
  async getUserFavorites(
    userId: number,
    query: QueryRecipeDto,
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, is_active: false },
      });
      if (!user) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      // normalize & validate paging params
      let page = Number(query.page) || 1;
      let limit = Number(query.limit) || 10;
      if (!Number.isFinite(page) || page < 1) page = 1;
      if (!Number.isFinite(limit) || limit < 1) limit = 10;
      limit = Math.min(limit, 1000);

      const offset = (page - 1) * limit;
      const { search, sortBy, order } = query;

      // build query: inner join to ensure user is in recipe.users
      const qb = this.wishlistRepository
        .createQueryBuilder('wishlist')
        .leftJoinAndSelect('wishlist.recipes', 'recipe')
        .leftJoinAndSelect('recipe.category', 'category')
        .leftJoinAndSelect('recipe.admin', 'admin')
        .where('recipe.is_active = :isActive', { isActive: false })
        .innerJoin('wishlist.users', 'favUser', 'favUser.id = :userId', {
          userId,
        });

      if (search) {
        qb.andWhere('LOWER(recipe.title) LIKE :title', {
          title: `%${String(search).toLowerCase()}%`,
        });
      }

      // safe sort fields
      const allowedSortFields = new Set([
        'id',
        'title',
        'slug',
        'image_url',
        'created_at',
        'recipe_count', // won't be present but kept for safety
      ]);
      const sortField =
        sortBy && allowedSortFields.has(sortBy)
          ? `recipe.${sortBy}`
          : 'recipe.id';
      const sortOrder = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      qb.orderBy(sortField, sortOrder as 'ASC' | 'DESC');

      qb.select([
        'wishlist.id',
        'recipe.id',
        'recipe.title',
        'recipe.slug',
        'recipe.image_url',
        'category.id',
        'category.name',
        'admin.id',
        'admin.username',
        'admin.role',
      ]);

      const [recipes, total] = await qb
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      const totalPages = Math.ceil(total / limit);
      const nextPage = page < totalPages ? page + 1 : false;
      const prevPage = page > 1 ? page - 1 : false;

      return {
        data: recipes,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          nextPage,
          prevPage,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if a recipe is in user's favorites
   */
  async isRecipeInFavorites(
    userId: number,
    recipeId: number,
  ): Promise<boolean> {
    try {
      const favoriteRecipe = await this.wishlistRepository
        .createQueryBuilder('wishlist')
        .leftJoinAndSelect('wishlist.users', 'users')
        .leftJoinAndSelect('wishlist.recipes', 'recipes')
        .where('users.id = :userId and recipes.id = :recipeId', {
          userId,
          recipeId,
        })
        .getOne();

      return !!favoriteRecipe;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Import additional recipe from CSV additional methods here
   * If filePath is provided, use it; otherwise use newest file in tmp/
   */
  async importRecipesFromCSV(filePath?: string): Promise<{ message: string; summary?: any; filePath?: string }> {
    try {
      let resolvedPath: string | null = null;

      if (filePath) {
        // accept absolute or project-relative paths
        resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        if (!fs.existsSync(resolvedPath)) {
          throw new HttpException('Provided CSV file not found', HttpStatus.BAD_REQUEST);
        }
      } else {
        const tmpDir = path.join(process.cwd(), process.env.TMP_DIR || 'tmp');
        if (!fs.existsSync(tmpDir)) {
          throw new HttpException('No tmp directory found', HttpStatus.BAD_REQUEST);
        }

        // find the newest recipes_export_*.csv file
        const files = fs
          .readdirSync(tmpDir)
          .filter((f) => f.startsWith('recipes_export_') && f.endsWith('.csv'));
        if (!files.length) {
          throw new HttpException('No export CSV found', HttpStatus.NOT_FOUND);
        }
        const newest = files
          .map((f) => ({ f, m: fs.statSync(path.join(tmpDir, f)).mtime.getTime() }))
          .sort((a, b) => b.m - a.m)[0].f;
        resolvedPath = path.join(tmpDir, newest);
      }

      // read and parse CSV
      const content = fs.readFileSync(resolvedPath, 'utf8');

      // basic CSV line parser that handles quoted fields and "" escapes
      const parseLine = (line: string): string[] => {
        const res: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"') {
              if (line[i + 1] === '"') {
                cur += '"';
                i++;
              } else {
                inQuotes = false;
              }
            } else {
              cur += ch;
            }
          } else {
            if (ch === '"') {
              inQuotes = true;
            } else if (ch === ',') {
              res.push(cur);
              cur = '';
            } else {
              cur += ch;
            }
          }
        }
        res.push(cur);
        return res;
      };

      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new HttpException('CSV has no data rows', HttpStatus.BAD_REQUEST);
      }
      const headers = parseLine(lines[0]).map((h) => h.trim());
      const rows = lines.slice(1).map((l) => parseLine(l));

      const summary = { imported: 0, skipped: 0, errors: 0, errorsDetails: [] };

      // helper slug
      const slugify = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      for (const row of rows) {
        try {
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = row[idx] ?? '';
          });

          const title = (obj['title'] || '').trim();
          if (!title) {
            summary.skipped++;
            continue;
          }

          // skip if recipe exists
          const exists = await this.recipeRepository.findOne({
            where: { title: title, is_active: false },
          });
          if (exists) {
            summary.skipped++;
            continue;
          }

          // category: try to find by name, create if not exist
          const categoryName = (obj['category_name'] || '').trim();
          let category = null;
          if (categoryName) {
            category = await this.categoryRepository.findOne({
              where: { name: categoryName },
            });
            if (!category) {
              const newCat = this.categoryRepository.create({
                name: categoryName,
                slug: slugify(categoryName),
                image_url: null,
                description: null,
              });
              category = await this.categoryRepository.save(newCat);
            }
          }

          // admin: optional lookup by username
          const adminUsername = (obj['admin_username'] || '').trim();
          let admin = null;
          if (adminUsername) {
            admin = await this.adminRepository.findOne({
              where: { username: adminUsername },
            });
          }

          // parse JSON-ish fields if present
          const parseMaybeJSON = (val: string) => {
            const t = val ?? '';
            const trimmed = t.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
              try {
                return JSON.parse(trimmed);
              } catch {
                try {
                  const fixed = trimmed.replace(/""/g, '"');
                  return JSON.parse(fixed);
                } catch {
                  return trimmed;
                }
              }
            }
            return trimmed;
          };

          const recipePayload: Partial<Recipe> = {
            title,
            slug: slugify(title),
            image_url: (obj['image_url'] || '').trim(),
            description: (obj['description'] || '').trim(),
            category: category || null,
            admin: admin || null,
          };

          const savedRecipe = await this.recipeRepository.save(
            this.recipeRepository.create(recipePayload),
          );

          // build detail
          const detailPayload: Partial<RecipeDetail> = {
            recipe: savedRecipe,
            recipe_video: (obj['recipe_video'] || '').trim(),
            time_preparation: (obj['time_preparation'] || '').trim(),
            time_cooking: (obj['time_cooking'] || '').trim(),
            recipe_type: (obj['recipe_type'] || '').trim(),
            ingredients: parseMaybeJSON(obj['ingredients']) ?? null,
            steps: parseMaybeJSON(obj['steps']) ?? null,
            nutrition_info: parseMaybeJSON(obj['nutrition_info']) ?? null,
            notes: (obj['notes'] || '').trim() || null,
            nutrition_facts:
              String(obj['nutrition_facts'] || '').toLowerCase() === 'true',
          };

          await this.recipeDetailRepository.save(
            this.recipeDetailRepository.create(detailPayload),
          );

          summary.imported++;
        } catch (rowErr) {
          summary.errors++;
          summary.errorsDetails.push(String(rowErr?.message || rowErr));
          this.logger.error('Import row failed', rowErr);
          continue;
        }
      }

      return {
        message: 'CSV imported successfully',
        summary,
        filePath: resolvedPath || undefined,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Export additional recipe to CSV additional methods here
   */
  async exportRecipesToCSV(): Promise<{ message: string; filePath?: string }> {
    try {
      // fetch recipes
      const recipes = await this.recipeRepository
        .createQueryBuilder('recipe')
        .leftJoin('recipe.category', 'category')
        .leftJoin('recipe.admin', 'admin')
        .where('recipe.is_active = :isActive', { isActive: false })
        .select([
          'recipe.id',
          'recipe.title',
          'recipe.slug',
          'recipe.image_url',
          'recipe.description',
          'category.id',
          'category.name',
          'admin.id',
          'admin.username',
        ])
        .orderBy('recipe.id', 'ASC')
        .getMany();

      const recipeIds = recipes.map((r) => r.id);
      let detailMap: Record<number, any> = {};

      if (recipeIds.length) {
        const detailRows = await this.recipeDetailRepository
          .createQueryBuilder('detail')
          .where('detail.recipe_id IN (:...ids)', { ids: recipeIds })
          .andWhere('detail.is_active = :isActive', { isActive: false })
          .select([
            'detail.recipe_id as recipe_id',
            'detail.recipe_video as recipe_video',
            'detail.time_preparation as time_preparation',
            'detail.time_cooking as time_cooking',
            'detail.recipe_type as recipe_type',
            'detail.ingredients as ingredients',
            'detail.steps as steps',
            'detail.nutrition_info as nutrition_info',
            'detail.notes as notes',
            'detail.nutrition_facts as nutrition_facts',
          ])
          .getRawMany();

        detailMap = {};
        detailRows.forEach((d) => {
          detailMap[Number(d.recipe_id)] = {
            recipe_video: d.recipe_video,
            time_preparation: d.time_preparation,
            time_cooking: d.time_cooking,
            recipe_type: d.recipe_type,
            ingredients: d.ingredients,
            steps: d.steps,
            nutrition_info: d.nutrition_info,
            notes: d.notes,
            nutrition_facts: d.nutrition_facts,
          };
        });
      }

      // prepare CSV header and rows
      const headers = [
        'id',
        'title',
        'slug',
        'image_url',
        'description',
        'category_name',
        'admin_username',
        'recipe_video',
        'time_preparation',
        'time_cooking',
        'recipe_type',
        'ingredients',
        'steps',
        'nutrition_info',
        'nutrition_facts',
        'notes',
      ];

      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = typeof v === 'string' ? v : JSON.stringify(v);
        return `"${String(s).replace(/"/g, '""')}"`;
      };

      const rows = recipes.map((r) => {
        const detail = detailMap[r.id] || {};
        return [
          escape(r.id),
          escape(r.title),
          escape(r.slug),
          escape(r.image_url),
          escape(r.description),
          escape(r.category ? r.category.name : ''),
          escape(r.admin ? r.admin.username : ''),
          escape(detail.recipe_video || ''),
          escape(detail.time_preparation || ''),
          escape(detail.time_cooking || ''),
          escape(detail.recipe_type || ''),
          escape(detail.ingredients || ''),
          escape(detail.steps || ''),
          escape(detail.nutrition_info || ''),
          escape(detail.nutrition_facts != null ? detail.nutrition_facts : ''),
          escape(detail.notes || ''),
        ].join(',');
      });

      const csvContent = `${headers.join(',')}\n${rows.join('\n')}`;

      // determine export directory (configurable in prod)
      const exportDirEnv = process.env.EXPORT_DIR;
      let exportDir: string = exportDirEnv
        ? path.resolve(String(exportDirEnv))
        : path.join(process.cwd(), 'tmp', 'exports');

      // create export dir if missing
      fs.mkdirSync(exportDir, { recursive: true });

      // test write permission (throws if not writable)
      try {
        fs.accessSync(exportDir, fs.constants.W_OK);
      } catch {
        // fallback to OS temp directory
        const osTmp = require('os').tmpdir();
        this.logger.warn(`Export dir not writable, falling back to OS tmp: ${osTmp}`);
        fs.mkdirSync(osTmp, { recursive: true });
        exportDir = osTmp;
      }

      const filename = `recipes_export_${Date.now()}.csv`;
      const finalPath = path.join(exportDir, filename);
      const tmpPath = `${finalPath}.tmp`;

      // atomic write: write to tmp then rename
      fs.writeFileSync(tmpPath, csvContent, { encoding: 'utf8' });
      try {
        fs.renameSync(tmpPath, finalPath);
      } catch (renameErr) {
        // if rename fails, attempt to unlink tmp and throw
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        throw renameErr;
      }

      // set file permissions to be readable
      try {
        fs.chmodSync(finalPath, 0o644);
      } catch (chmodErr) {
        // ignore chmod errors on platforms that don't support it
      }

      return { message: 'CSV exported successfully', filePath: finalPath };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
