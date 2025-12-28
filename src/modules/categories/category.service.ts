import { HttpException, Injectable, HttpStatus, Logger } from '@nestjs/common';
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
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CategoryService {
  // Implement category service methods here
  private readonly logger = new Logger(CategoryService.name);
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
  ) {}

  async findAll(query: QueryCategoryDto): Promise<CategoryListResponse> {
    try {
      // normalize & validate paging params
      let sortBy = query.sortBy || 'id';
      let order: 'ASC' | 'DESC' =
        query.order && query.order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      let page = Number(query.page) || 1;
      let limit = Number(query.limit) || 10;
      if (!Number.isFinite(page) || page < 1) page = 1;
      if (!Number.isFinite(limit) || limit < 1) limit = 10;
      limit = Math.min(limit, 1000); // cap to avoid huge queries

      const offset = (page - 1) * limit;

      // Base count query for total categories matching filters (keeps pagination correct)
      const countQb = this.categoryRepository
        .createQueryBuilder('category')
        .where('category.is_active = :isActive', { isActive: false });

      const total = await countQb.getCount();

      // If no categories, return empty pagination
      if (total === 0) {
        return {
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit,
            totalPages: 0,
            nextPage: false,
            prevPage: false,
          },
        };
      }

      // Fetch paginated categories with recipe counts
      const qb = this.categoryRepository
        .createQueryBuilder('category')
        // join recipes and count them per category; filter recipe active flag if needed
        .leftJoin('category.recipes', 'recipe', 'recipe.is_active = false')
        .select([
          'category.id',
          'category.name',
          'category.slug',
          'category.image_url',
          'category.description',
          'category.created_at',
        ])
        .addSelect('COUNT(recipe.id)', 'recipe_count')
        .where('category.is_active = :isActive', { isActive: false });

      if (query.search) {
        qb.andWhere('LOWER(category.name) LIKE :name', {
          name: `%${String(query.search).toLowerCase()}%`,
        });
      }

      // Validate sortBy against allowed fields to prevent injection
      const allowedSortFields = new Set([
        'id',
        'name',
        'slug',
        'image_url',
        'description',
        'created_at',
        'recipe_count',
      ]);
      let orderByExpr: string;
      if (allowedSortFields.has(sortBy)) {
        orderByExpr =
          sortBy === 'recipe_count' ? 'recipe_count' : `category.${sortBy}`;
      } else {
        orderByExpr = 'category.id';
      }

      qb.groupBy('category.id')
        .orderBy(orderByExpr, order)
        .limit(limit)
        .offset(offset);

      const rawRows = await qb.getRawMany();

      // Map raw rows to return shape (convert recipe_count to number)
      const categories = rawRows.map((r) => ({
        id: r.category_id,
        name: r.category_name,
        slug: r.category_slug,
        image_url: r.category_image_url,
        description: r.category_description,
        created_at: r.category_created_at,
        recipe_count: Number(r.recipe_count || 0),
      }));

      const totalPages = Math.max(1, Math.ceil(total / limit));
      if (page > totalPages) page = totalPages;

      return {
        data: categories,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          nextPage: page < totalPages ? page + 1 : false,
          prevPage: page > 1 ? page - 1 : false,
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

  async findById(id: number): Promise<CategoryResponse> {
    try {
      // fetch basic category fields
      const category = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.id = :id', { id })
        .andWhere('category.is_active = :isActive', { isActive: false })
        .select([
          'category.id',
          'category.name',
          'category.slug',
          'category.image_url',
          'category.description',
          'category.created_at',
        ])
        .getOne();

      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }

      // count recipes that belong to this category and match the active filter
      const recipeCount = await this.recipeRepository
        .createQueryBuilder('recipe')
        .where('recipe."categoryId" = :categoryId', { categoryId: id })
        .andWhere('recipe.is_active = :isActive', { isActive: false })
        .getCount();

      return {
        ...category,
        recipe_count: Number(recipeCount || 0),
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
      const category = await this.categoryRepository.findOne({
        where: { id, is_active: false },
      });
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

  /**
   * Import categories service methods here
   */
  async importCategoriesFromCSV(
    filePath?: string,
  ): Promise<{ message: string; summary?: any; filePath?: string }> {
    try {
      let resolvedPath: string | null = null;

      if (filePath) {
        resolvedPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), filePath);
        if (!fs.existsSync(resolvedPath)) {
          throw new HttpException(
            'Provided CSV file not found',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
          throw new HttpException('No tmp directory found', HttpStatus.BAD_REQUEST);
        }

        const files = fs
          .readdirSync(tmpDir)
          .filter(
            (f) =>
              f.toLowerCase().endsWith('.csv') &&
              f.toLowerCase().includes('category'),
          );
        if (!files.length) {
          throw new HttpException(
            'No categories CSV found in tmp/',
            HttpStatus.NOT_FOUND,
          );
        }
        const newest = files
          .map((f) => ({
            f,
            m: fs.statSync(path.join(tmpDir, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.m - a.m)[0].f;
        resolvedPath = path.join(tmpDir, newest);
      }

      const content = fs.readFileSync(resolvedPath, 'utf8');

      // CSV parser (handles quoted fields and "" escapes)
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

      const rawHeaders = parseLine(lines[0]).map((h) => h.trim());
      const headers = rawHeaders.map((h) => h.toLowerCase());
      const rows = lines.slice(1).map((l) => parseLine(l));

      const summary = {
        imported: 0,
        skipped: 0,
        errors: 0,
        errorsDetails: [],
      };

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

          const name = (obj['name'] || obj['title'] || '').trim();
          if (!name) {
            summary.skipped++;
            continue;
          }

          const slugFromCsv = (obj['slug'] || '').trim();
          const slug = slugFromCsv || slugify(name);
          const image_url =
            (obj['image_url'] || obj['image'] || '').trim() || null;
          const description = (obj['description'] || '').trim() || null;

          // avoid duplicates: check existing by name or slug
          const exists = await this.categoryRepository.findOne({
            where: [
              { name: name, is_active: false },
              { slug: slug, is_active: false },
            ],
          });
          if (exists) {
            summary.skipped++;
            continue;
          }

          const newCategory = this.categoryRepository.create({
            name,
            slug,
            image_url,
            description,
            is_active: false,
          });
          await this.categoryRepository.save(newCategory);
          summary.imported++;
        } catch (rowErr) {
          summary.errors++;
          summary.errorsDetails.push(String(rowErr?.message || rowErr));
          this.logger?.error?.('Import category row failed', rowErr);
          continue;
        }
      }

      return {
        message: 'Categories imported successfully',
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
   * Export categories service methods here
   */
  async exportCategoriesToCSV(): Promise<{ filePath: string }> {
    try {
      const categories = await this.categoryRepository.find();
      // Implement CSV export logic here
      const exportDirEnv = process.env.EXPORT_DIR;
      let exportDir: string = exportDirEnv || './exports';
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      const filePath = path.join(exportDir, 'categories.csv');
      const csvData = categories
        .map((category) => {
          return `${category.id},"${category.name}","${category.slug}","${category.image_url}","${category.description}",${category.is_active},${category.created_at.toISOString()}`;
        })
        .join('\n');
      const csvHeader =
        'id,name,slug,image_url,description,is_active,created_at\n';
      fs.writeFileSync(filePath, csvHeader + csvData);
      return { filePath };
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
