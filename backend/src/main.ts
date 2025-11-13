import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // (프록시 뒤에 있다면) 실 IP 인식
  // 예: Nginx/Elastic Beanstalk/Render/Heroku 등
  const expressApp = app.getHttpAdapter().getInstance() as unknown as Express;
  expressApp.set('trust proxy', 1);

  // 보안 헤더
  app.use(helmet());

  // 전역 Rate Limiting (IP당 15분에 100요청)
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
  const max = Number(process.env.RATE_LIMIT_MAX ?? 100);
  app.use(
    rateLimit({
      windowMs: windowMs,
      max: max,
      standardHeaders: true, // RateLimit-* 헤더 표준화
      legacyHeaders: false,
      message: 'Too many requests, please try again later.',
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 필드는 요청에서 자동 제거
      forbidNonWhitelisted: true, // DTO에 정의 안 된 값이 오면 400 에러
      transform: true, // @Transform, 타입(Number 등) 자동 변환
    }),
  );

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 5000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
