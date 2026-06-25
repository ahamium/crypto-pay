# 1) 의존성 설치 전용 단계
FROM node:20-alpine AS deps
WORKDIR /app

ENV NODE_ENV=development

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
RUN pnpm config set node-linker hoisted

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# 2) 실제 빌드 단계
# deps stage를 그대로 이어받아서 pnpm을 다시 설치하지 않음
FROM deps AS build
WORKDIR /app

ENV NODE_ENV=production

# Next.js NEXT_PUBLIC_* 값은 빌드 시점에 브라우저 번들에 박힘
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_NETWORK
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_NETWORK=$NEXT_PUBLIC_NETWORK
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

COPY . .

RUN pnpm build

# 3) 실행 전용 경량 단계
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 런타임에도 남겨둠. 단 NEXT_PUBLIC 값은 이미 build 단계에서 반영됨.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_NETWORK
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_NETWORK=$NEXT_PUBLIC_NETWORK
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public

RUN chown -R app:app /app
USER app

EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]