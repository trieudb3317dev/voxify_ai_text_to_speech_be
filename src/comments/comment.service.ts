import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CommentPaginationResponse,
  CreateCommentDto,
  QueryCommentParams,
} from './comment.dto';
import { Recipe } from 'src/modules/recipes/recipe.entity';
import { User } from 'src/modules/user/user.entity';
import { Comment } from './comment.entity';

@Injectable()
export class CommentService {
  // Implement comment service methods here
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Add your comment service methods here
   */
  async postComment(
    commentData: CreateCommentDto,
    recipeId: number,
    postById: number,
  ): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: postById },
      });
      if (!user) {
        throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
      }
      const recipe = await this.recipeRepository.findOne({
        where: { id: recipeId },
      });
      if (!recipe) {
        throw new HttpException('Recipe not found', HttpStatus.NOT_FOUND);
      }
      const comment = this.commentRepository.create({
        content: commentData.content,
        star: commentData.star,
        recipe: recipe,
        post_by: user,
      } as Comment);
      await this.commentRepository.save(comment);
      return { message: 'Comment posted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to post comment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get comments for a specific recipe
   */
  async getCommentsByRecipe(
    recipeId: number,
    query: QueryCommentParams,
  ): Promise<CommentPaginationResponse> {
    try {
      const { page = 1, limit = 10, search, sortBy, order } = query;

      const qb = this.commentRepository
        .createQueryBuilder('comment')
        .leftJoin('comment.post_by', 'post_by')
        .leftJoin('comment.recipe', 'recipe')
        .where('recipe.id = :recipeId', { recipeId })
        .select([
          'comment.id',
          'comment.content',
          'comment.star',
          'comment.created_at',
          'post_by.id',
          'post_by.username',
          'post_by.full_name',
          'post_by.email',
          'post_by.avatar',
          'recipe.id',
          'recipe.title',
          'recipe.image_url',
        ]);
      if (search) {
        qb.andWhere('comment.content ILIKE :search', { search: `%${search}%` });
      }

      if (sortBy) {
        const orderDirection = order === 'DESC' ? 'DESC' : 'ASC';
        qb.orderBy(`comment.${sortBy}`, orderDirection);
      }

      const [comments, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      const totalPages = Math.ceil(total / limit);
      const nextPage = page < totalPages ? page + 1 : false;
      const prevPage = page > 1 ? page - 1 : false;

      if (!comments.length) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            nextPage,
            prevPage,
          },
        };
      }

      return {
        data: comments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          nextPage,
          prevPage,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get comments: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete your comment service methods here
   */
  async deleteComment(
    commentId: number,
    userId: number,
  ): Promise<{ message: string }> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
        relations: ['post_by'],
      });
      if (!comment) {
        throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
      }
      if (comment.post_by?.id !== userId) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
      await this.commentRepository.remove(comment);
      return { message: 'Comment deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete comment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
