FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm config set node-linker hoisted
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm config set node-linker hoisted
# deps 단계에서 node_modules만 복사
COPY --from=deps /app/node_modules ./node_modules
# 소스 코드만 복사 (node_modules 덮어쓰지 않음)
COPY . .
RUN pnpm prisma generate && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=5000
RUN addgroup -S app && adduser -S app -G app
USER app
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 5000
CMD ["node","dist/src/main.js"]

