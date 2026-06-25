#!/bin/sh
set -e

# echo "Running Prisma migrations..."

# # 1) 정식 환경이면 보통 migrate deploy 를 사용
# #    만약 migration 파일이 없거나 실패하면, fallback 으로 db push 시도
# npx prisma migrate deploy || npx prisma db push

echo "Checking writable SQLite directory..."
mkdir -p /home/data
touch /home/data/.write-test
rm /home/data/.write-test

echo "Running Prisma migration or db push..."
./node_modules/.bin/prisma migrate deploy || ./node_modules/.bin/prisma db push

echo "Seeding TokenWhitelist..."
node dist/prisma/seed.js

echo "Starting NestJS app..."
node dist/src/main.js
