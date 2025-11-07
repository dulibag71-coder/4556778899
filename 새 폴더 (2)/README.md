# GolfLink AI Coach

AI 기반 골프 스윙 코칭 시스템

## 기능

### 🎯 훈련 모드
- 실시간 자세 분석 (MediaPipe Pose)
- AI 코칭 피드백
- 음성/자막 안내
- 난이도 조절 (초보/중급/프로)
- 스윙 단계별 분석 (백스윙/다운스윙/임팩트)

### 📊 분석 모드
- 자세 분석
- 각도 측정
- 스윙 단계별 분석
- 리포트 생성

### 👨‍🏫 코칭 모드
- 맞춤형 코칭
- 7일/30일 프로그램
- 목표 설정
- 진행 상황 추적

### 📈 히스토리
- 훈련 기록 조회
- 통계 분석
- 성취도 확인
- 레벨 및 포인트

## 기술 스택

### 백엔드
- FastAPI
- MediaPipe Pose
- OpenCV
- SQLite
- ReportLab (PDF 생성)

### 프론트엔드
- React
- Vite
- React Router
- WebSocket

## 설치 및 실행

### 백엔드

```bash
cd backend
pip install -r requirements.txt
python main.py
```

백엔드는 `http://localhost:8000`에서 실행됩니다.

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 `http://localhost:3000`에서 실행됩니다.

## 프로젝트 구조

```
.
├── backend/
│   ├── main.py                 # FastAPI 메인 앱
│   ├── pose_analyzer.py        # 자세 분석기
│   ├── ai_coach.py             # AI 코칭 엔진
│   ├── training_session.py     # 훈련 세션 관리
│   ├── report_generator.py     # 리포트 생성기
│   ├── database.py             # 데이터베이스 관리
│   └── requirements.txt        # Python 의존성
├── frontend/
│   ├── src/
│   │   ├── pages/              # 페이지 컴포넌트
│   │   ├── components/         # 재사용 컴포넌트
│   │   └── App.jsx             # 메인 앱
│   └── package.json            # Node.js 의존성
└── README.md
```

## 주요 기능 상세

### 실시간 자세 분석
- MediaPipe Pose를 사용한 관절 위치 추적
- 0.1초 단위로 각도 계산
- 스윙 단계별 이상 각도 검출

### AI 코칭 피드백
- 난이도별 허용 오차 설정
- 실시간 피드백 제공
- 개선 제안 생성

### 훈련 리포트
- PDF 형식 리포트 생성
- 세션 통계
- 개선 영역 및 강점 분석

## 개발 로드맵

- [ ] 음성 코칭 (TTS)
- [ ] 리플레이 트레이너
- [ ] 가상 트레이닝 프로그램
- [ ] 클라우드 동기화
- [ ] 모바일 앱 지원

## 라이선스

MIT License

