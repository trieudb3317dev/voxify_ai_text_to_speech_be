import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateCommentDto } from './comment.dto';
import { JwtAdminAuthGuard } from 'src/modules/admin/guards/jwt-admin-auth.guard';

@Controller('comments')
export class CommentController {
  // Implement comment controller methods here
  constructor(private readonly commentService: CommentService) {}

  /**
   * post comment controller methods here
   */
  @ApiOperation({ summary: 'Post a comment for a recipe' })
  @ApiResponse({
    status: 201,
    description: 'Comment posted successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @Post('/recipe/:id')
  @UseGuards(JwtAuthGuard)
  async postComment(
    @Body() commentData: CreateCommentDto,
    @Req() req: any,
    @Param('id') recipeId: number,
  ) {
    console.log('User Info:', req.user);
    const postById = req.user.id;
    // Implement the logic to post a comment
    return this.commentService.postComment(commentData, recipeId, postById);
  }

  /**
   * Delete comment controller methods here
   */
  @ApiOperation({ summary: 'Delete a comment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('id') commentId: number, @Req() req: any) {
    const userId = req.user.id;
    // Implement the logic to delete a comment
    return this.commentService.deleteComment(commentId, userId);
  }

  /**
   * Get comments for a recipe controller methods here
   */
  @ApiOperation({ summary: 'Get comments for a specific recipe' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @Get('/recipe/:id')
  // @UseGuards(JwtAuthGuard)
  // @UseGuards(JwtAdminAuthGuard)
  async getCommentsByRecipe(@Param('id') recipeId: number, @Query() query: any) {
    // Implement the logic to get comments for a recipe
    return this.commentService.getCommentsByRecipe(recipeId, query);
  }
}
