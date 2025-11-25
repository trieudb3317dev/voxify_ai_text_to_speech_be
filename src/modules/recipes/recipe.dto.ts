export class RecipeDto<T> {
  title: string;
  image_url: string;
  description: string;
  category_id: number;
  user_id: number;
  // Additional fields for recipe details
  detail: RecipeDetailDto;
}

export class RecipeDetailDto {
  recipe_video: string;
  time_preparation: string;
  time_cooking: string;
  recipe_type: string;
  ingredients: object[] | null;
  instructions: object[] | null;
  nutrition_info: string[] | null;
  nutrition_facts: boolean;
  notes: string | null;
}

export class RecipeUpdateDto {
  title?: string;
  image_url?: string;
  description?: string;
}

export class RecipeDetailUpdateDto {
  recipe_video?: string;
  time_preparation?: string;
  time_cooking?: string;
  recipe_type?: string;
  ingredients?: object[] | null;
  instructions?: object[] | null;
  nutrition_info?: string[] | null;
  nutrition_facts?: boolean;
  notes?: string | null;
}

export class RecipeResponse<T> {
  id: number;
  title: string;
  slug: string;
  image_url: string;
  description: string;
  category: T;
}

export class RecipeDetailResponse {
  id: number;
  recipe_video: number;
  time_preparation: string;
  time_cooking: string;
  recipe_type: string;
  ingredients: string[] | null;
  steps: string[] | null;
  nutrition_info: string[] | null;
  notes: string | null;
  nutrition_facts: boolean;
}

export class PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

export class RecipeListResponse<T> {
  data: RecipeResponse<T>[];
  pagination: PaginationResponse;
}

export class QueryRecipeDto {
  // Define query parameters for recipe listing here
  search?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
  page?: string;
  limit?: string;
}
