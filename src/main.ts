import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { DatabaseExceptionFilter } from './exceptions/database-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new DatabaseExceptionFilter());

  const configService = app.get(ConfigService);

  // normalize backend URLs from env (comma separated)
  const backendEnv = configService.get<string>('BACKEND_URL') || '';
  const backendUrls = backendEnv
    .split(',')
    .map((u) => String(u).trim())
    .filter((u) => u.length > 0)
    .map((u) => u.replace(/\/+$/g, '')); // remove trailing slash

  // Cấu hình Swagger
  const swaggerBuilder = new DocumentBuilder()
    .setTitle('Recipe Instructions API Documentation')
    .setDescription('NestJS API Swagger')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${configService.get<number>('APP_PORT', 8080)}/api/v1`, 'Local server');

  // add one server entry per BACKEND_URL
  backendUrls.forEach((url) =>
    swaggerBuilder.addServer(`${url}/api/v1`, `Backend: ${url}`),
  );

  const swaggerConfig = swaggerBuilder.build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document); // Đường dẫn: /api-docs

  // Lấy danh sách các domain từ biến môi trường, nếu không thì mặc định là localhost
  const frontendUrls = configService.get<string>('FRONTEND_URLS').split(','); // Tách các URL nếu có nhiều hơn 1 domain
  const backendUrlsEnv = backendUrls; // reuse normalized array

  const port = configService.get<number>('APP_PORT', 8080);

  // Enable validation
  // app.useGlobalPipes(new ValidationPipe({
  //   whitelist: true,
  //   transform: true,
  //   forbidNonWhitelisted: false,
  // }));

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Cấu hình CORS hỗ trợ subdomain
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === `http://localhost:${port}` || frontendUrls.includes(origin)) {
        // Cho phép các yêu cầu không có origin (các công cụ test như Postman)
        return callback(null, true);
      }

      const isAllowed = frontendUrls.some((url) => {
        const regex = new RegExp(
          `^https?://([a-z0-9-]+\.)?${url.replace('http://', '').replace('https://', '')}$`,
        );
        return regex.test(origin);
      });

      if (isAllowed) {
        callback(null, true); // Yêu cầu được phép
      } else {
        callback(new Error('Not allowed by CORS')); // Yêu cầu bị chặn
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
    credentials: true, // Cho phép cookie
  });

  app.use(cookieParser());
  await app.listen(port);
  console.log(`\uD83D\uDE80 Ứng dụng đang chạy tại: ${backendUrlsEnv.length ? backendUrlsEnv.join(', ') : `http://localhost:${port}`}`);
  console.log(`📚 Swagger docs: ${backendUrlsEnv.length ? backendUrlsEnv.join(', ') : `http://localhost:${port}`}/api-docs`);
  console.log(`🔗 Backend URLs: ${backendUrlsEnv.length ? backendUrlsEnv.join(', ') : '[none]'}`);
}

bootstrap();
