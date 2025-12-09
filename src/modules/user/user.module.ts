import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Otp } from '../otp/otp.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from '../auth/strategies/jwt-auth.strategy';
import { Recipe } from '../recipes/recipe.entity';
import { Wishlist } from 'src/whistlist/whistlist.entity';
import { Comment } from 'src/comments/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Otp, Recipe, Wishlist, Comment]),
    AuthModule,
  ],
  controllers: [UserController],
  providers: [UserService, JwtService, JwtStrategy],
  exports: [UserService],
})
export class UserModule {}
