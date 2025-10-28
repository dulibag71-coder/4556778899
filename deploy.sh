#!/bin/bash

# AI Navigator 배포 스크립트
# Usage: ./deploy.sh [environment]
# environment: local, staging, production

set -e

ENVIRONMENT=${1:-local}
PROJECT_NAME="ai-navigator"

echo "========================================="
echo "AI Navigator 배포 스크립트"
echo "Environment: $ENVIRONMENT"
echo "========================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 확인
check_requirements() {
    log_info "시스템 요구사항 확인 중..."

    # Docker 확인
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되어 있지 않습니다."
        exit 1
    fi

    # Docker Compose 확인
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose가 설치되어 있지 않습니다."
        exit 1
    fi

    # Node.js 확인
    if ! command -v node &> /dev/null; then
        log_warn "Node.js가 설치되어 있지 않습니다. (모바일 앱 빌드용)"
    fi

    log_info "✓ 모든 요구사항이 충족되었습니다."
}

# 환경 변수 설정
setup_environment() {
    log_info "환경 변수 설정 중..."

    if [ "$ENVIRONMENT" == "local" ]; then
        # 로컬 환경 변수
        if [ ! -f backend/.env ]; then
            log_info "backend/.env 파일 생성 중..."
            cp backend/.env.example backend/.env
            log_warn "backend/.env 파일을 확인하고 필요한 값을 입력하세요!"
        fi
    else
        log_info "$ENVIRONMENT 환경 변수를 확인하세요."
    fi
}

# 데이터베이스 시작
start_database() {
    log_info "데이터베이스 시작 중..."

    docker-compose up -d postgres redis mongodb

    log_info "데이터베이스 준비 대기 중 (10초)..."
    sleep 10

    log_info "✓ 데이터베이스가 시작되었습니다."
}

# 백엔드 빌드 및 시작
deploy_backend() {
    log_info "백엔드 빌드 및 시작 중..."

    cd backend

    # 의존성 설치
    if [ ! -d "node_modules" ]; then
        log_info "의존성 설치 중..."
        npm install
    fi

    # TypeScript 빌드
    log_info "TypeScript 컴파일 중..."
    npm run build

    cd ..

    # Docker Compose로 시작
    docker-compose up -d backend

    log_info "✓ 백엔드가 시작되었습니다 (http://localhost:5000)"
}

# Nginx 시작
deploy_nginx() {
    log_info "Nginx 시작 중..."

    # Nginx 설정 확인
    if [ ! -f nginx/nginx.conf ]; then
        log_warn "Nginx 설정 파일이 없습니다. 기본 설정 생성 중..."
        mkdir -p nginx
        cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:5000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /health {
            proxy_pass http://backend/health;
        }
    }
}
EOF
    fi

    docker-compose up -d nginx

    log_info "✓ Nginx가 시작되었습니다 (http://localhost)"
}

# 헬스 체크
health_check() {
    log_info "서비스 헬스 체크 중..."

    sleep 5

    # 백엔드 헬스 체크
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        log_info "✓ 백엔드가 정상 작동 중입니다."
    else
        log_error "✗ 백엔드 헬스 체크 실패"
        exit 1
    fi
}

# 로그 확인
show_logs() {
    log_info "로그 확인:"
    echo ""
    echo "백엔드 로그: docker-compose logs -f backend"
    echo "데이터베이스 로그: docker-compose logs -f postgres"
    echo "모든 로그: docker-compose logs -f"
    echo ""
}

# 상태 확인
show_status() {
    log_info "실행 중인 서비스:"
    docker-compose ps
    echo ""
    log_info "접속 정보:"
    echo "  - API 서버: http://localhost:5000"
    echo "  - API Health: http://localhost:5000/health"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo "  - MongoDB: localhost:27017"
}

# 클린업
cleanup() {
    log_info "정리 작업 중..."
    docker-compose down
    log_info "✓ 모든 서비스가 중지되었습니다."
}

# 메인 배포 프로세스
main() {
    case "$ENVIRONMENT" in
        local)
            log_info "로컬 개발 환경 배포 시작..."
            check_requirements
            setup_environment
            start_database
            deploy_backend
            health_check
            show_status
            show_logs
            ;;

        staging)
            log_info "스테이징 환경 배포 시작..."
            check_requirements
            setup_environment
            start_database
            deploy_backend
            deploy_nginx
            health_check
            show_status
            ;;

        production)
            log_info "프로덕션 환경 배포 시작..."
            log_warn "프로덕션 배포는 신중하게 진행해야 합니다!"
            read -p "계속하시겠습니까? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                log_info "배포가 취소되었습니다."
                exit 0
            fi

            check_requirements
            setup_environment
            start_database
            deploy_backend
            deploy_nginx
            health_check
            show_status
            ;;

        stop)
            cleanup
            ;;

        *)
            log_error "알 수 없는 환경: $ENVIRONMENT"
            echo "Usage: ./deploy.sh [local|staging|production|stop]"
            exit 1
            ;;
    esac

    echo ""
    echo "========================================="
    log_info "배포 완료! 🚀"
    echo "========================================="
}

# 스크립트 실행
main
