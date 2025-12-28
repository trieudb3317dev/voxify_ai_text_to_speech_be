import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
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
import * as fs from 'fs';
import * as path from 'path';
import { Admin } from '../admin/admin.entity'; // only used for lookup via repo if needed (repo injection not present here)

@Injectable()
export class BlogService {
  // Implement blog service methods here
  private readonly logger = new Logger(BlogService.name);
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
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
          'blog.notes',
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
          notes: blog.notes,
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

  async findAllByCreated(
    query: QueryBlogDto,
    createdById: number,
  ): Promise<BlogPaginationResponse<BlogResponse<any>>> {
    try {
      const { page = 1, limit = 10, search = '' } = query;
      const createdBy = createdById;

      const creator = await this.adminRepository.findOne({
        where: { id: createdBy },
      });

      if (!creator) {
        throw new HttpException('Creator not found', HttpStatus.NOT_FOUND);
      }

      const qb = this.blogRepository
        .createQueryBuilder('blog')
        .leftJoin('blog.admin', 'admin')
        .select([
          'blog.id',
          'blog.title',
          'blog.slug',
          'blog.image_url',
          'blog.created_at',
          'blog.notes',
          'admin.id',
          'admin.username',
          'admin.avatar',
        ])
        .where('blog.is_active = :isActive', { isActive: false })
        .andWhere('admin.id = :createdBy', { createdBy: creator.id });

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
          notes: blog.notes,
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
          'blog.notes',
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
        notes: blog.notes,
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

  // helper slugify
  private slugify(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // basic CSV line parser that handles quoted fields and "" escapes
  private parseLine(line: string): string[] {
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
  }

  /**
   * Import blogs from CSV.
   * If filePath is provided (absolute or project-relative) it will be used.
   * Otherwise the newest CSV containing 'blog' in tmp/ will be used.
   *
   * Expected CSV header example:
   * title,image_url,content,notes,admin_username
   * content field should be JSON (array of {heading,body,image}) or a JSON-stringified value.
   */
  async importBlogsFromCSV(
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
        const tmpDir = path.join(process.cwd(), process.env.TMP_DIR || 'tmp');
        if (!fs.existsSync(tmpDir)) {
          throw new HttpException(
            'No tmp directory found',
            HttpStatus.BAD_REQUEST,
          );
        }
        const files = fs
          .readdirSync(tmpDir)
          .filter(
            (f) =>
              f.toLowerCase().endsWith('.csv') &&
              f.toLowerCase().includes('blog'),
          );
        if (!files.length) {
          throw new HttpException(
            'No blog CSV found in tmp/',
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
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new HttpException('CSV has no data rows', HttpStatus.BAD_REQUEST);
      }
      const headers = this.parseLine(lines[0]).map((h) =>
        h.trim().toLowerCase(),
      );
      const rows = lines.slice(1).map((l) => this.parseLine(l));

      const summary = {
        imported: 0,
        skipped: 0,
        errors: 0,
        errorsDetails: [] as string[],
      };

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

          // skip if blog exists
          const exists = await this.blogRepository.findOne({
            where: { title: title, is_active: false },
          });
          if (exists) {
            summary.skipped++;
            continue;
          }

          const slug = (obj['slug'] || '').trim() || this.slugify(title);
          const image_url = (obj['image_url'] || '').trim() || null;
          const notes = (obj['notes'] || '').trim() || null;

          // parse content: expect JSON array or plain text
          let contentField: any = obj['content'] || '';
          let parsedContent: any = null;
          if (contentField) {
            try {
              parsedContent = JSON.parse(contentField);
            } catch {
              // try to fix double-quoted JSON ("" replaced) or treat as string
              try {
                parsedContent = JSON.parse(contentField.replace(/""/g, '"'));
              } catch {
                // not JSON -> wrap as single heading/body
                parsedContent = [
                  { heading: '', body: contentField, image: '' },
                ];
              }
            }
          }

          // admin lookup by username if provided
          let adminRef = null;
          const adminUsername = (obj['admin_username'] || '').trim();
          if (adminUsername) {
            // find admin via repository (we didn't inject admin repo in this service).
            // Try to use query to find admin id via QueryBuilder on admin table using raw SQL to avoid adding injection.
            const adminRow = await this.blogRepository.manager.query(
              'SELECT id FROM admins WHERE username = $1 LIMIT 1',
              [adminUsername],
            );
            if (adminRow && adminRow[0]) {
              adminRef = { id: adminRow[0].id };
            }
          }

          const blogPayload: Partial<Blog> = {
            title,
            slug,
            image_url,
            content: parsedContent,
            notes,
            admin: adminRef as any,
            is_active: false,
          };

          const saved = await this.blogRepository.save(
            this.blogRepository.create(blogPayload),
          );
          if (saved) summary.imported++;
        } catch (rowErr) {
          summary.errors++;
          summary.errorsDetails.push(String(rowErr?.message || rowErr));
          this.logger?.error?.('Import blog row failed', rowErr);
          continue;
        }
      }

      return {
        message: 'Blogs imported successfully',
        summary,
        filePath: resolvedPath || undefined,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exportBlogsToCSV(): Promise<{ filePath: string }> {
    try {
      const blogs = await this.blogRepository.find({
        where: { is_active: false },
        relations: ['admin'],
      });
      if (!blogs || blogs.length === 0) {
        throw new HttpException(
          'No blogs available to export',
          HttpStatus.NOT_FOUND,
        );
      }

      const headers = [
        'id',
        'title',
        'slug',
        'image_url',
        'content',
        'created_at',
        'notes',
        'admin_id',
        'admin_username',
        'is_active',
      ];

      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = typeof v === 'string' ? v : JSON.stringify(v);
        return `"${String(s).replace(/"/g, '""')}"`;
      };

      const rows = blogs.map((b) =>
        [
          escape(b.id),
          escape(b.title),
          escape(b.slug),
          escape(b.image_url || ''),
          escape(b.content ? JSON.stringify(b.content) : ''),
          escape(b.created_at ? b.created_at.toISOString() : ''),
          escape(b.notes || ''),
          escape(b.admin ? b.admin.id : ''),
          escape(b.admin ? b.admin.username : ''),
          escape(b.is_active),
        ].join(','),
      );

      const csvContent = `${headers.join(',')}\n${rows.join('\n')}`;

      // export dir configurable
      const exportDirEnv = process.env.EXPORT_DIR;
      let exportDir = exportDirEnv
        ? path.resolve(String(exportDirEnv))
        : path.join(process.cwd(), 'tmp', 'exports');
      fs.mkdirSync(exportDir, { recursive: true });

      // atomic write
      const filename = `blogs_export_${Date.now()}.csv`;
      const finalPath = path.join(exportDir, filename);
      const tmpPath = `${finalPath}.tmp`;
      fs.writeFileSync(tmpPath, csvContent, { encoding: 'utf8' });
      fs.renameSync(tmpPath, finalPath);
      try {
        fs.chmodSync(finalPath, 0o644);
      } catch {}

      return { filePath: finalPath };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
