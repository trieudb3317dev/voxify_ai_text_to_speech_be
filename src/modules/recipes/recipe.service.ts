import {
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
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

@Injectable()
export class RecipeService {
  // Implement recipe service methods here
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
      const nextPage = Number(page) < totalPages ? Number(page) + 1 : null;
      const prevPage = Number(page) > 1 ? Number(page) - 1 : null;

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

      return {
        data: recipes,
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
      const { title, image_url, description, category_id, user_id, detail } =
        recipeData;

      const slug = title
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

      const existingUser = await this.adminRepository.findOne({
        where: { id: req.sub, is_active: false },
      });
      if (!existingUser) {
        throw new HttpException('You are not admin', HttpStatus.NOT_FOUND);
      }
      console.log('existingUser', existingUser);
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
        admin: user_id || req.sub ? existingUser : null, // Assign the user appropriately
      });
      await this.recipeRepository.save(newRecipe);

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

      category.recipes = [...(category.recipes || []), newRecipe];
      await this.categoryRepository.save(category);

      return { message: 'Recipe created successfully' };
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
}
