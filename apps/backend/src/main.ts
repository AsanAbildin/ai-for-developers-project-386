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

  // Node по умолчанию закрывает idle keep-alive соединение через 5с, из-за
  // чего клиенты получают редкие "socket hang up" при повторном использовании
  // пула соединений. Поднимаем таймауты до стандартных значений за прокси.
  const server = app.getHttpServer();
  server.keepAliveTimeout = 60_000;
  server.headersTimeout = 66_000;
}

void bootstrap();
