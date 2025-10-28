# AI Navigator 배포 가이드

## 목차
1. [개발 환경 설정](#개발-환경-설정)
2. [로컬 개발](#로컬-개발)
3. [프로덕션 배포](#프로덕션-배포)
4. [모바일 앱 빌드](#모바일-앱-빌드)
5. [CI/CD 설정](#cicd-설정)

---

## 개발 환경 설정

### 사전 요구사항

1. **Node.js** (v18 이상)
   ```bash
   # nvm 사용 권장
   nvm install 18
   nvm use 18
   ```

2. **Docker & Docker Compose**
   ```bash
   # macOS (Homebrew)
   brew install docker docker-compose

   # Ubuntu
   sudo apt-get install docker.io docker-compose
   ```

3. **React Native CLI**
   ```bash
   npm install -g react-native-cli
   ```

4. **Xcode** (iOS 개발용, macOS 전용)
   - App Store에서 설치

5. **Android Studio** (Android 개발용)
   - https://developer.android.com/studio

---

## 로컬 개발

### 1. 프로젝트 클론

```bash
git clone https://github.com/your-org/ai-navigator.git
cd ai-navigator
```

### 2. 백엔드 설정

```bash
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 수정 (API 키, 데이터베이스 정보 등)

# 데이터베이스 및 Redis 시작 (Docker)
docker-compose up -d postgres redis

# 데이터베이스 마이그레이션
npm run migrate

# 시드 데이터 (선택사항)
npm run seed

# 개발 서버 시작
npm run dev
```

서버가 http://localhost:5000 에서 실행됩니다.

### 3. 모바일 앱 설정

```bash
cd mobile

# 의존성 설치
npm install

# iOS용 (macOS만 가능)
cd ios && pod install && cd ..

# Android용
# Android Studio에서 android 폴더 열기
```

### 4. 모바일 앱 실행

**iOS:**
```bash
npm run ios
# 또는 특정 기기
npm run ios -- --simulator="iPhone 14 Pro"
```

**Android:**
```bash
npm run android
# 또는 특정 기기
npm run android -- --deviceId=<device-id>
```

### 5. API 키 설정

#### Google Maps API
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성
3. API & Services → Enable APIs
   - Maps SDK for Android
   - Maps SDK for iOS
   - Directions API
   - Distance Matrix API
4. API 키 생성 및 복사
5. `.env` 파일에 추가

#### Firebase
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 생성
3. Android/iOS 앱 추가
4. `google-services.json` (Android) 다운로드 → `mobile/android/app/`
5. `GoogleService-Info.plist` (iOS) 다운로드 → `mobile/ios/`

---

## 프로덕션 배포

### AWS 배포 (권장)

#### 1. AWS 계정 및 CLI 설정

```bash
# AWS CLI 설치
brew install awscli  # macOS
# 또는
sudo apt-get install awscli  # Ubuntu

# AWS 인증
aws configure
# Access Key ID, Secret Access Key, Region 입력
```

#### 2. RDS (PostgreSQL) 생성

```bash
# AWS Console에서:
# 1. RDS → Create database
# 2. PostgreSQL 15 선택
# 3. DB instance identifier: ai-navigator-db
# 4. Master username: postgres
# 5. Master password: 생성
# 6. DB instance class: db.t3.medium (시작용)
# 7. Storage: 100 GB, Autoscaling 활성화
# 8. VPC: Default 또는 생성
# 9. Public access: Yes (개발용), No (프로덕션)
# 10. Create database
```

#### 3. ElastiCache (Redis) 생성

```bash
# AWS Console에서:
# 1. ElastiCache → Create
# 2. Redis 선택
# 3. Name: ai-navigator-cache
# 4. Node type: cache.t3.micro (시작용)
# 5. Number of replicas: 2 (고가용성)
# 6. Subnet group: Default 또는 생성
# 7. Create
```

#### 4. EC2 인스턴스 또는 ECS 설정

**Option A: EC2 (간단)**

```bash
# 1. EC2 인스턴스 생성 (Ubuntu 22.04, t3.medium)
# 2. 보안 그룹 설정:
#    - SSH (22)
#    - HTTP (80)
#    - HTTPS (443)
#    - Custom (5000) - API

# 3. SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 4. 서버 설정
sudo apt-get update
sudo apt-get install docker.io docker-compose git nodejs npm

# 5. 프로젝트 클론
git clone https://github.com/your-org/ai-navigator.git
cd ai-navigator

# 6. 환경 변수 설정
cd backend
cp .env.example .env
nano .env  # RDS, ElastiCache 정보 입력

# 7. Docker 실행
docker-compose -f docker-compose.prod.yml up -d

# 8. Nginx 설정 (SSL 인증서)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.ai-navigator.com
```

**Option B: ECS (스케일링 가능, 권장)**

```bash
# 1. ECR 리포지토리 생성
aws ecr create-repository --repository-name ai-navigator-backend

# 2. Docker 이미지 빌드 및 푸시
cd backend
docker build -t ai-navigator-backend .
docker tag ai-navigator-backend:latest <ecr-url>/ai-navigator-backend:latest
docker push <ecr-url>/ai-navigator-backend:latest

# 3. ECS 클러스터 생성 (Fargate)
aws ecs create-cluster --cluster-name ai-navigator-cluster

# 4. Task Definition 생성 (JSON 파일)
# 5. Service 생성
# 6. Application Load Balancer 연결
```

#### 5. S3 버킷 생성 (이미지 저장)

```bash
aws s3 mb s3://ai-navigator-uploads --region ap-northeast-2

# CORS 설정
aws s3api put-bucket-cors --bucket ai-navigator-uploads --cors-configuration file://s3-cors.json
```

#### 6. CloudFront 설정 (CDN)

```bash
# AWS Console에서:
# 1. CloudFront → Create Distribution
# 2. Origin: S3 버킷 또는 ALB
# 3. Viewer Protocol Policy: Redirect HTTP to HTTPS
# 4. Alternate Domain Names (CNAMEs): api.ai-navigator.com
# 5. SSL Certificate: 사용자 정의 (ACM에서 생성)
# 6. Create Distribution
```

---

## 모바일 앱 빌드

### iOS 앱 빌드 (App Store 배포)

#### 1. Xcode 설정

```bash
cd mobile/ios
open AINavigator.xcworkspace
```

#### 2. Apple Developer 계정 설정
- Xcode → Preferences → Accounts → Add Apple ID
- Team 선택

#### 3. Bundle Identifier 설정
- Target 선택 → General
- Bundle Identifier: `com.yourcompany.ainavigator`

#### 4. Provisioning Profile 설정
- Signing & Capabilities
- Automatically manage signing 체크

#### 5. App Icon & Launch Screen
- Assets.xcassets에 아이콘 추가
- LaunchScreen.storyboard 커스터마이즈

#### 6. 빌드 설정
```bash
# Product → Scheme → Edit Scheme → Release
# Product → Archive

# Archive 완료 후:
# - Validate App (테스트)
# - Distribute App (App Store Connect 업로드)
```

#### 7. App Store Connect 설정
1. https://appstoreconnect.apple.com 접속
2. My Apps → + → New App
3. 앱 정보 입력:
   - Name: AI Navigator
   - Language: Korean
   - Bundle ID: com.yourcompany.ainavigator
   - SKU: ai-navigator-001
4. 가격 설정 (무료)
5. 앱 정보 작성:
   - 설명
   - 키워드
   - 스크린샷 (6.5", 5.5" 필수)
   - 프리뷰 비디오
6. App Review Information
7. Submit for Review

### Android 앱 빌드 (Google Play 배포)

#### 1. Keystore 생성

```bash
cd mobile/android/app

keytool -genkeypair -v -storetype PKCS12 \
  -keystore ai-navigator-release.keystore \
  -alias ai-navigator-key \
  -keyalg RSA -keysize 2048 -validity 10000

# 비밀번호 입력 및 정보 입력
```

#### 2. Gradle 설정

`android/gradle.properties` 파일에 추가:
```properties
MYAPP_RELEASE_STORE_FILE=ai-navigator-release.keystore
MYAPP_RELEASE_KEY_ALIAS=ai-navigator-key
MYAPP_RELEASE_STORE_PASSWORD=****
MYAPP_RELEASE_KEY_PASSWORD=****
```

`android/app/build.gradle` 수정:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 3. AAB 빌드

```bash
cd mobile/android

./gradlew bundleRelease

# 결과 파일:
# android/app/build/outputs/bundle/release/app-release.aab
```

#### 4. Google Play Console 설정

1. https://play.google.com/console 접속
2. Create app
3. 앱 정보 입력:
   - App name: AI Navigator
   - Default language: Korean
   - App or game: App
   - Free or paid: Free
4. 설정 완료:
   - 앱 카테고리: 지도/내비게이션
   - 타겟 연령: 전체 이용가
   - 콘텐츠 등급
5. 스토어 등록정보:
   - 짧은 설명 (80자)
   - 전체 설명 (4000자)
   - 스크린샷 (최소 2개)
   - 아이콘 (512x512)
6. 프로덕션 트랙:
   - Create new release
   - Upload AAB 파일
   - Release name: v1.0.0
   - Release notes
7. Roll out to production

---

## CI/CD 설정

### GitHub Actions

`.github/workflows/deploy.yml` 생성:

```yaml
name: Deploy AI Navigator

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Run tests
        run: cd backend && npm test
      - name: Run linter
        run: cd backend && npm run lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ai-navigator-backend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG ./backend
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ai-navigator-cluster \
            --service ai-navigator-service \
            --force-new-deployment

  build-mobile-ios:
    needs: test
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: cd mobile && npm ci

      - name: Install pods
        run: cd mobile/ios && pod install

      - name: Build iOS app
        run: |
          cd mobile/ios
          xcodebuild -workspace AINavigator.xcworkspace \
            -scheme AINavigator \
            -configuration Release \
            -archivePath AINavigator.xcarchive \
            archive

  build-mobile-android:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v2

      - name: Install dependencies
        run: cd mobile && npm ci

      - name: Build Android AAB
        run: |
          cd mobile/android
          ./gradlew bundleRelease
```

---

## 모니터링 및 로깅

### Sentry 설정 (에러 추적)

```bash
# Backend
npm install @sentry/node

# Mobile
npm install @sentry/react-native
npx @sentry/wizard -i reactNative -p ios android
```

### New Relic 설정 (APM)

```bash
npm install newrelic

# newrelic.js 설정
```

### CloudWatch Logs (AWS)

```bash
# ECS Task Definition에 awslogs 드라이버 설정
```

---

## 성능 최적화

### 1. 이미지 최적화
- WebP 형식 사용
- 다양한 해상도 제공
- Lazy loading

### 2. API 응답 최적화
- Redis 캐싱
- GraphQL 사용 검토
- Pagination 구현

### 3. 모바일 번들 크기 최적화
```bash
# 번들 분석
npx react-native-bundle-visualizer

# Hermes 엔진 활성화 (Android)
```

---

## 보안 체크리스트

- [ ] HTTPS 강제 적용
- [ ] API Rate Limiting 설정
- [ ] SQL Injection 방어
- [ ] XSS 방어
- [ ] CSRF 토큰
- [ ] 환경 변수 암호화
- [ ] 정기 보안 감사
- [ ] 의존성 취약점 검사 (`npm audit`)
- [ ] SSL 인증서 자동 갱신

---

## 트러블슈팅

### 1. Docker 권한 오류
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 2. iOS 빌드 실패
```bash
cd mobile/ios
pod deintegrate
pod install
```

### 3. Android 빌드 실패
```bash
cd mobile/android
./gradlew clean
rm -rf .gradle
```

---

## 지원

- 📧 이메일: support@ai-navigator.com
- 📚 문서: https://docs.ai-navigator.com
- 💬 Discord: https://discord.gg/ai-navigator

---

**배포 성공을 기원합니다! 🚀**
