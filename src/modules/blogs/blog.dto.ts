import { IsString, Min, MinLength } from 'class-validator';

export class CreateBlogDto {
  @IsString({ message: 'Title must be a string' })
  @MinLength(5, { message: 'Title is too short' })
  title: string;
  image_url?: string;
  content: object[] | null;
  notes?: string;
}

export class UpdateBlogDto {
  @IsString({ message: 'Title must be a string' })
  @MinLength(5, { message: 'Title is too short' })
  title?: string;
  slug?: string;
  content?: object[] | null;
  image_url?: string;
  notes?: string;
}

export class QueryBlogDto {
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number;

  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsString({ message: 'SortBy must be a string' })
  sortBy?: string;

  @IsString({ message: 'SortOrder must be a string' })
  sortOrder?: 'ASC' | 'DESC';
}

export class BlogResponse<T> {
  id: number;
  title: string;
  slug: string;
  image_url: string;
  created_at: Date;
  content?: T;
  notes?: string;
  admin: {
    id: number;
    username: string;
    avatar: string;
  };
}

export class PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

export class BlogPaginationResponse<BlogResponse> {
  data: BlogResponse[];
  pagination: PaginationResponse;
}
