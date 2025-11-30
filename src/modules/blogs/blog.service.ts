import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Blog } from './blog.entity';
import { Repository } from 'typeorm';
import {
  BlogPaginationResponse,
  BlogResponse,
  CreateBlogDto,
  QueryBlogDto,
  UpdateBlogDto,
} from './blog.dto';

@Injectable()
export class BlogService {
  // Implement blog service methods here
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
  ) {}

  async findAll(
    query: QueryBlogDto,
  ): Promise<BlogPaginationResponse<BlogResponse<any>>> {
    try {
      const { page = 1, limit = 10, search = '' } = query;

      const qb = this.blogRepository
        .createQueryBuilder('blog')
        .leftJoin('blog.admin', 'admin')
        .select([
          'blog.id',
          'blog.title',
          'blog.slug',
          'blog.image_url',
          'blog.created_at',
          'admin.id',
          'admin.username',
          'admin.avatar',
        ])
        .where('blog.is_active = :isActive', { isActive: false });

      if (search) {
        qb.andWhere('LOWER(blog.title) LIKE :title', {
          title: `%${String(search).toLowerCase()}%`,
        });
      }

      const [blogs, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      if (!blogs || blogs.length === 0) {
        return {
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
            nextPage: null,
            prevPage: null,
          },
        };
      }

      const totalPages = Math.ceil(total / limit);
      const nextPage = page < totalPages ? page + 1 : null;
      const prevPage = page > 1 ? page - 1 : null;

      return {
        data: blogs.map((blog) => ({
          id: blog.id,
          title: blog.title,
          slug: blog.slug,
          image_url: blog.image_url,
          content: blog.content,
          created_at: blog.created_at,
          admin: {
            id: blog.admin.id,
            username: blog.admin.username,
            avatar: blog.admin.avatar,
          },
        })),
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
      throw new HttpException(`Internal server error: ${error.message}`, 500);
    }
  }

  async findById(id: number): Promise<BlogResponse<any>> {
    try {
      const blog = await this.blogRepository
        .createQueryBuilder('blog')
        .leftJoin('blog.admin', 'admin')
        .select([
          'blog.id',
          'blog.title',
          'blog.slug',
          'blog.image_url',
          'blog.content',
          'blog.created_at',
          'admin.id',
          'admin.username',
          'admin.avatar',
        ])
        .where('blog.id = :id', { id })
        .andWhere('blog.is_active = :isActive', { isActive: false })
        .getOne();

      if (!blog) {
        throw new HttpException('Blog not found', 404);
      }
      return {
        id: blog.id,
        title: blog.title,
        slug: blog.slug,
        image_url: blog.image_url,
        content: blog.content,
        created_at: blog.created_at,
        admin: {
          id: blog.admin.id,
          username: blog.admin.username,
          avatar: blog.admin.avatar,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Internal server error: ${error.message}`, 500);
    }
  }

  async create(
    blogData: CreateBlogDto,
    req: any,
  ): Promise<{ message: string }> {
    try {
      const { title } = blogData;
      if (!req || !req.id) {
        throw new HttpException(
          'You are not authorized',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const existingBlog = await this.blogRepository.findOne({
        where: { title: title, is_active: false },
      });
      if (existingBlog) {
        throw new HttpException('Blog with this title already exists', 409);
      }
      const slug = title
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

      const blogDataWithAdmin = {
        ...blogData,
        slug,
        admin: { id: req.id },
      };

      const newBlog = this.blogRepository.create(blogDataWithAdmin);
      await this.blogRepository.save(newBlog);
      return { message: 'Blog created successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Internal server error: ${error.message}`, 500);
    }
  }

  async update(
    id: number,
    blogData: UpdateBlogDto,
  ): Promise<{ message: string }> {
    try {
      const blog = await this.blogRepository.findOne({
        where: { id, is_active: false },
      });
      if (!blog) {
        throw new HttpException('Blog not found', 404);
      }
      const slug = blogData.title
        ? blogData.title
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '')
        : blog.slug;

      blogData = { ...blogData, slug: slug };

      await this.blogRepository.update(id, blogData);
      return { message: 'Blog updated successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Internal server error: ${error.message}`, 500);
    }
  }

  async delete(id: number): Promise<{ message: string }> {
    try {
      const blog = await this.blogRepository.findOne({
        where: { id, is_active: false },
      });
      if (!blog) {
        throw new HttpException('Blog not found', 404);
      }
      await this.blogRepository.update(id, { is_active: true });
      return { message: 'Blog deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Internal server error: ${error.message}`, 500);
    }
  }
}
