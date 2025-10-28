# AI Navigator 빠른 시작 가이드

5분 만에 AI Navigator를 로컬에서 실행하세요!

## 🚀 빠른 시작 (로컬 개발)

### 1단계: 사전 요구사항 확인

다음 도구들이 설치되어 있어야 합니다:

```bash
# Docker 버전 확인
docker --version
# 출력 예: Docker version 24.0.0

# Docker Compose 버전 확인
docker-compose --version
# 출력 예: docker-compose version 1.29.0

# Node.js 버전 확인 (모바일 앱용)
node --version
# 출력 예: v18.0.0
```

**설치가 필요한 경우:**
- Docker: https://docs.docker.com/get-docker/
- Node.js: https://nodejs.org/ (v18 이상)

### 2단계: 환경 변수 설정

```bash
# backend 디렉토리로 이동
cd backend

# .env 파일 생성
cp .env.example .env

# .env 파일 편집 (기본값으로도 작동합니다)
nano .env
```

**최소 설정 (기본값):**
```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_navigator
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3단계: 배포 스크립트 실행

```bash
# 프로젝트 루트로 이동
cd ..

# 배포 스크립트 실행
./deploy.sh local
```

이 스크립트가 자동으로:
1. ✅ 데이터베이스 (PostgreSQL) 시작
2. ✅ 캐시 서버 (Redis) 시작
3. ✅ 로그 DB (MongoDB) 시작
4. ✅ 백엔드 API 서버 빌드 및 시작
5. ✅ Nginx 리버스 프록시 시작
6. ✅ 헬스 체크 수행

### 4단계: 확인

배포가 완료되면 다음 서비스에 접속할 수 있습니다:

```bash
# API 헬스 체크
curl http://localhost:5000/health

# 출력:
# {
#   "status": "OK",
#   "timestamp": "2025-10-28T...",
#   "uptime": 10.5
# }
```

**접속 정보:**
- 🌐 API 서버: http://localhost:5000
- 📊 API 문서: http://localhost:5000/api/docs (예정)
- 🗄️ PostgreSQL: localhost:5432
- 💾 Redis: localhost:6379
- 📝 MongoDB: localhost:27017

---

## 📱 모바일 앱 실행 (선택사항)

### iOS (macOS에서만 가능)

```bash
cd mobile

# 의존성 설치
npm install

# iOS pods 설치
cd ios && pod install && cd ..

# iOS 시뮬레이터 실행
npm run ios
```

### Android

```bash
cd mobile

# 의존성 설치
npm install

# Android 에뮬레이터 또는 기기 연결 후
npm run android
```

---

## 🔧 유용한 명령어

### 서비스 관리

```bash
# 모든 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그 확인
docker-compose logs -f backend

# 서비스 재시작
docker-compose restart backend

# 모든 서비스 중지
./deploy.sh stop

# 또는
docker-compose down
```

### 데이터베이스 접속

```bash
# PostgreSQL 접속
docker exec -it ai-navigator-db psql -U postgres -d ai_navigator

# Redis 접속
docker exec -it ai-navigator-redis redis-cli

# MongoDB 접속
docker exec -it ai-navigator-mongodb mongosh
```

### 백엔드 개발 모드

```bash
cd backend

# Hot reload로 개발 서버 실행
npm run dev
```

---

## 🧪 API 테스트

### 1. 헬스 체크

```bash
curl http://localhost:5000/health
```

### 2. 로그인

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. 사용자 정보 조회

```bash
curl http://localhost:5000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 경로 계산 (예정)

```bash
curl -X POST http://localhost:5000/api/v1/routes/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "origin": {
      "latitude": 37.5665,
      "longitude": 126.9780
    },
    "destination": {
      "latitude": 37.5511,
      "longitude": 126.9882
    },
    "mode": "ai-recommended"
  }'
```

---

## 🐛 문제 해결

### 1. Docker가 시작되지 않음

```bash
# Docker 데몬 시작
sudo systemctl start docker

# macOS
open -a Docker
```

### 2. 포트 충돌

다른 서비스가 5000, 5432, 6379 포트를 사용 중일 수 있습니다.

```bash
# 포트 사용 확인 (macOS/Linux)
lsof -i :5000
lsof -i :5432
lsof -i :6379

# 프로세스 종료
kill -9 <PID>
```

### 3. 데이터베이스 연결 실패

```bash
# 데이터베이스 컨테이너 재시작
docker-compose restart postgres

# 로그 확인
docker-compose logs postgres
```

### 4. 백엔드 빌드 실패

```bash
cd backend

# node_modules 삭제 및 재설치
rm -rf node_modules package-lock.json
npm install

# TypeScript 재빌드
npm run build
```

### 5. 모바일 앱 실행 실패

```bash
cd mobile

# 캐시 삭제
npm start -- --reset-cache

# iOS pod 재설치
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..

# Android 클린
cd android && ./gradlew clean && cd ..
```

---

## 📊 모니터링

### Docker 리소스 사용량

```bash
docker stats
```

### 로그 실시간 모니터링

```bash
# 모든 서비스
docker-compose logs -f --tail=100

# 백엔드만
docker-compose logs -f backend --tail=100

# 에러만
docker-compose logs -f | grep ERROR
```

---

## 🛑 서비스 중지

### 임시 중지 (데이터 유지)

```bash
docker-compose stop
```

### 완전 중지 (데이터 유지)

```bash
docker-compose down
```

### 완전 삭제 (데이터 포함)

```bash
docker-compose down -v
```

---

## 🔄 업데이트

### 코드 업데이트 후 재배포

```bash
# Git pull
git pull origin main

# 재배포
./deploy.sh local
```

### Docker 이미지 재빌드

```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## 📚 다음 단계

1. **API 개발**: `backend/src/routes/` 에서 라우트 추가
2. **모바일 개발**: `mobile/src/screens/` 에서 화면 추가
3. **데이터베이스**: 마이그레이션 파일 작성
4. **테스트**: 단위 테스트 및 통합 테스트 추가

**상세 가이드:**
- 프로덕션 로드맵: `PRODUCTION_ROADMAP.md`
- 배포 가이드: `DEPLOYMENT_GUIDE.md`
- 디자인 명세: `DESIGN_SPEC.md`

---

## 💬 도움말

문제가 발생했나요? 다음 정보를 확인하세요:

1. Docker 컨테이너 상태: `docker-compose ps`
2. 로그 확인: `docker-compose logs -f`
3. 환경 변수 확인: `cat backend/.env`
4. 디스크 공간 확인: `df -h`

**GitHub Issues**: 버그 리포트 및 기능 요청

---

**즐거운 개발 되세요! 🚀**
