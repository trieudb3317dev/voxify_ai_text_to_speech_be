import { HttpException, Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import {
  CategoryDto,
  CategoryListResponse,
  CategoryResponse,
  QueryCategoryDto,
  RecipeSub,
} from './category.dto';
import { Recipe } from '../recipes/recipe.entity';

@Injectable()
export class CategoryService {
  // Implement category service methods here
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
  ) {}

  async findAll(
    query: QueryCategoryDto,
  ): Promise<CategoryListResponse<RecipeSub>> {
    try {
      // normalize & validate paging params
      let page = Number(query.page) || 1;
      let limit = Number(query.limit) || 10;
      if (!Number.isFinite(page) || page < 1) page = 1;
      if (!Number.isFinite(limit) || limit < 1) limit = 10;
      limit = Math.min(limit, 1000); // cap to avoid huge queries

      const qb = this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin('category.recipes', 'recipe')
        // clearer filter for active categories
        .where('category.is_active = :isActive', { isActive: false })
        .select([
          'category.id',
          'category.name',
          'category.slug',
          'category.image_url',
          'category.description',
          'recipe.id',
          'recipe.title',
          'recipe.slug',
          'recipe.image_url',
        ]);

      if (query.search) {
        // case-insensitive search across DBs using LOWER(...)
        qb.andWhere('LOWER(category.name) LIKE :name', {
          name: `%${String(query.search).toLowerCase()}%`,
        });
      }

      const offset = (page - 1) * limit;
      const [categories, total] = await qb
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      // handle empty result set consistently
      if (total === 0 || categories.length === 0) {
        return {
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit,
            totalPages: 0,
            nextPage: null,
            prevPage: null,
          },
        };
      }

      const totalPages = Math.max(1, Math.ceil(total / limit));
      // adjust page if it's out of range
      if (page > totalPages) page = totalPages;

      const from = offset + 1;
      const to = Math.min(offset + categories.length, total);

      return {
        data: categories,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
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

  async findById(id: number): Promise<CategoryResponse<RecipeSub>> {
    try {
      const category = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.id = :id', { id })
        .andWhere('category.is_active = :isActive', { isActive: false })
        .leftJoin('category.recipes', 'recipe')
        .select([
          'category.id',
          'category.name',
          'category.slug',
          'category.image_url',
          'category.description',
          'recipe.id',
          'recipe.title',
          'recipe.slug',
          'recipe.image_url',
        ])
        .getOne();

      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }

      return category;
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

  async create(cateDto: CategoryDto): Promise<{ message: string }> {
    try {
      const { name, image_url, description } = cateDto;
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: name, is_active: false },
      });
      if (existingCategory) {
        throw new HttpException(
          'Category with this name already exists',
          HttpStatus.CONFLICT,
        );
      }

      const slug = name
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

      const newCategory = this.categoryRepository.create({
        name,
        slug,
        image_url,
        description,
      });

      await this.categoryRepository.save(newCategory);

      return { message: 'Category created successfully' };
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

  async update(id: number, cateDto: CategoryDto): Promise<{ message: string }> {
    try {
      const category = await this.categoryRepository.findOne({ where: { id, is_active: false } });
      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }
      const { name, image_url, description } = cateDto;

      const slug = name
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

      await this.categoryRepository.update(id, {
        name: name,
        slug: slug,
        image_url: image_url,
        description: description,
      });

      return { message: 'Category updated successfully' };
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
      const category = await this.categoryRepository.findOne({
        where: { id, is_active: false },
      });
      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }
      await this.recipeRepository
        .createQueryBuilder()
        .update(Recipe)
        .set({ is_active: true })
        .where('categoryId = :categoryId', { categoryId: id })
        .execute();

      await this.categoryRepository.update(id, { is_active: true });

      return { message: 'Category deleted successfully' };
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
