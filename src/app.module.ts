import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig } from './config/app.config';
import { SharedModule } from './shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { OtpModule } from './modules/otp/otp.module';
import { CategoryModule } from './modules/categories/category.module';
import { RecipeModule } from './modules/recipes/recipe.module';
import { AdminModule } from './modules/admin/admin.module';
import { BlogModule } from './modules/blogs/blog.module';
import { WhistlistModule } from './whistlist/whistlist.module';
import { CommentModule } from './comments/comment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        databaseConfig(configService),
      inject: [ConfigService],
    }),
    SharedModule,
    AuthModule,
    UserModule,
    OtpModule,
    CategoryModule,
    RecipeModule,
    AdminModule,
    BlogModule,
    WhistlistModule,
    CommentModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    appConfig(consumer);
  }
}
