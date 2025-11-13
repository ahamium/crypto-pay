# 1) 의존성 설치 전용 단계
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm config set node-linker hoisted
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# 2) 실제 빌드 단계
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm config set node-linker hoisted
# deps 단계에서 node_modules만 복사
COPY --from=deps /app/node_modules ./node_modules
# 소스 코드만 복사 (node_modules 덮어쓰지 않음)
COPY . .
RUN pnpm build

# 3) 실행 전용 경량 단계
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# 보안상 non-root 유저 생성
RUN addgroup -S app && adduser -S app -G app
USER app
# Next.js 빌드 산출물만 복사
COPY --from=build /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
# Next의 프로덕션 서버 실행
CMD ["node","node_modules/next/dist/bin/next","start","-p","3000"]
