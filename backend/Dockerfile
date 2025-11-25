# 1) deps: 의존성 설치
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=development

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm config set node-linker hoisted

# pnpm-lock과 package.json만 먼저 복사해서 캐시 활용
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# 2) build: Prisma client 생성 + Nest 빌드
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=development

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm config set node-linker hoisted

# 전체 소스 복사
COPY . .
# deps 단계에서 설치한 node_modules 복사
COPY --from=deps /app/node_modules ./node_modules

# Prisma client 생성 + Nest 빌드
RUN pnpm prisma generate
RUN pnpm build

# 3) runner: 실제 실행 컨테이너
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=5000

# 비-root 유저 생성
RUN addgroup -S app && adduser -S app -G app

# 빌드 산출물 및 의존성 복사
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# 필요하면 여기서도 권한 정리 (선택)
RUN chown -R app:app /app
USER app

EXPOSE 5000
CMD ["node", "dist/src/main.js"]
