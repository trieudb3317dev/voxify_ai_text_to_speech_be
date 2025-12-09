import { Module } from '@nestjs/common';
import { RecipeController } from './recipe.controller';
import { RecipeService } from './recipe.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from './recipe.entity';
import { RecipeDetail } from './recipe-detail.entity';
import { Category } from '../categories/category.entity';
import { User } from '../user/user.entity';
import { AdminModule } from '../admin/admin.module';
import { Admin } from '../admin/admin.entity';
import { Wishlist } from 'src/whistlist/whistlist.entity';
import { Comment } from 'src/comments/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeDetail, Category, User, Admin, Wishlist, Comment]),
    AdminModule,
  ],
  controllers: [RecipeController],
  providers: [RecipeService],
  exports: [RecipeService],
})
export class RecipeModule {}
