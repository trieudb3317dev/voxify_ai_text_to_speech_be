import { IsString, MinLength } from 'class-validator';

export class CategoryDto {
  // Define category data transfer object properties here
  @IsString({ message: 'Name must be a string' })
  @MinLength(3, {
    message: 'Name is too short, minimum length is 3 characters',
  })
  name: string;

  @IsString({ message: 'Image URL must be a string' })
  image_url: string;

  @IsString({ message: 'Description must be a string' })
  description?: string;
}

export class QueryCategoryDto {
  // Define query parameters for category listing here
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsString({ message: 'SortBy must be a string' })
  sortBy?: string;

  @IsString({ message: 'Order must be a string' })
  order?: 'ASC' | 'DESC';

  @IsString({ message: 'Page must be a string' })
  page?: string;

  @IsString({ message: 'Limit must be a string' })
  limit?: string;
}

export class PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | boolean;
  prevPage: number | boolean;
}

export class CategoryResponse {
  id: number;
  name: string;
  slug: string;
  image_url: string;
  description: string;
  recipe_count: number;
  created_at: Date;
}

export class RecipeSub {
  id: number;
  title: string;
  slug: string;
  image_url: string;
}

export class CategoryListResponse {
  data: CategoryResponse[];
  pagination: PaginationResponse;
}
