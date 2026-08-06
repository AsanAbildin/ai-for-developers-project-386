import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Фронтенд — отдельный процесс/порт (apps/frontend), поэтому CORS открыт.
  app.enableCors();

  // Совпадает с NUXT_PUBLIC_API_BASE_URL фронтенда (http://localhost:3000/api).
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
