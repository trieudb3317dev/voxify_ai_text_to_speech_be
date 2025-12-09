export class CreateCommentDto {
  content: string;
  star: number;
}

export class UpdateCommentDto {
  content?: string;
  star?: number;
}

export class CommentResponse<
  U = {
    id: number;
    username: string;
    email: string;
  },
  R = {
    id: number;
    title: string;
    slug: string;
    image_url: string;
    description: string;
  },
> {
  id: number;
  content: string;
  star: number;
  recipe: R;
  post_by: U;
  created_at: Date;
}

export class Pagination {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  nextPage?: number | boolean;
  prevPage?: number | boolean;
}

export class CommentPaginationResponse {
  data: CommentResponse[];
  pagination: Pagination;
}

export class QueryCommentParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}
