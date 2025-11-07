# GolfLink AI Coach 설치 가이드

## 사전 요구사항

- Python 3.8 이상
- Node.js 16 이상
- 웹캠 또는 카메라 지원 디바이스

## 백엔드 설정

1. 백엔드 디렉토리로 이동
```bash
cd backend
```

2. 가상 환경 생성 (선택사항)
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. 의존성 설치
```bash
pip install -r requirements.txt
```

4. 백엔드 실행
```bash
python main.py
```

백엔드가 `http://localhost:8000`에서 실행됩니다.

## 프론트엔드 설정

1. 프론트엔드 디렉토리로 이동
```bash
cd frontend
```

2. 의존성 설치
```bash
npm install
```

3. 프론트엔드 실행
```bash
npm run dev
```

프론트엔드가 `http://localhost:3000`에서 실행됩니다.

## 사용 방법

1. 브라우저에서 `http://localhost:3000` 접속
2. "훈련 모드" 클릭
3. 카메라 권한 허용
4. 난이도 선택 (초보/중급/프로)
5. "훈련 시작" 버튼 클릭
6. 골프 스윙 동작 수행
7. 실시간 피드백 확인

## 문제 해결

### 카메라 접근 오류
- 브라우저에서 카메라 권한을 확인하세요
- HTTPS 또는 localhost에서만 작동합니다

### WebSocket 연결 오류
- 백엔드가 실행 중인지 확인하세요
- 포트 8000이 사용 가능한지 확인하세요

### MediaPipe 오류
- Python 버전을 확인하세요 (3.8 이상 필요)
- 의존성을 다시 설치해보세요: `pip install -r requirements.txt --upgrade`

## 개발 모드

### 백엔드 개발
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 프론트엔드 개발
```bash
cd frontend
npm run dev
```

## 프로덕션 빌드

### 프론트엔드 빌드
```bash
cd frontend
npm run build
```

빌드된 파일은 `frontend/dist` 디렉토리에 생성됩니다.

## 데이터베이스

SQLite 데이터베이스는 `backend/golflink.db`에 자동 생성됩니다.

## 리포트

생성된 리포트는 `backend/reports` 디렉토리에 저장됩니다.

