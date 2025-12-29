import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { Recipe } from 'src/modules/recipes/recipe.entity';
import { User } from 'src/modules/user/user.entity';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { AdminModule } from 'src/modules/admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Recipe, User]),
    AuthModule,
    AdminModule,
  ],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
