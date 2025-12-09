import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wishlist } from './whistlist.entity';
import { Recipe } from 'src/modules/recipes/recipe.entity';
import { User } from 'src/modules/user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wishlist, Recipe, User])],
  controllers: [],
  providers: [],
  exports: [],
})
export class WhistlistModule {}
