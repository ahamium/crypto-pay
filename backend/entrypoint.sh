#!/bin/sh
set -e

echo "Running Prisma migrations..."

# 1) 정식 환경이면 보통 migrate deploy 를 사용
#    만약 migration 파일이 없거나 실패하면, fallback 으로 db push 시도
npx prisma migrate deploy || npx prisma db push

echo "Starting NestJS app..."
node dist/src/main.js
