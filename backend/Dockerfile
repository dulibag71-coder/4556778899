# AI Navigator Backend Dockerfile

FROM node:18-alpine AS builder

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 복사
COPY . .

# TypeScript 빌드
RUN npm install -D typescript @types/node
RUN npm run build

# Production 이미지
FROM node:18-alpine

WORKDIR /app

# 필요한 패키지만 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 로그 디렉토리 생성
RUN mkdir -p logs

# 포트 노출
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# 애플리케이션 시작
CMD ["node", "dist/server.js"]
