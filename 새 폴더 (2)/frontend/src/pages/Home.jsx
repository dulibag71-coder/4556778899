import React from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

function Home() {
  return (
    <div className="container">
      <div className="header">
        <h1>🏌️ GolfLink AI Coach</h1>
        <p>AI 기반 골프 스윙 코칭 시스템</p>
        <nav>
          <Link to="/">홈</Link>
          <Link to="/training">훈련 모드</Link>
          <Link to="/analysis">분석 모드</Link>
          <Link to="/coaching">코칭 모드</Link>
          <Link to="/history">히스토리</Link>
        </nav>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '40px' }}>
        <div className="card">
          <h2>🎯 훈련 모드</h2>
          <p>실시간 AI 피드백을 받으며 골프 스윙을 연습하세요.</p>
          <ul style={{ margin: '16px 0', paddingLeft: '20px' }}>
            <li>실시간 자세 분석</li>
            <li>AI 코칭 피드백</li>
            <li>음성/자막 안내</li>
            <li>난이도 조절</li>
          </ul>
          <Link to="/training">
            <button className="btn">훈련 시작</button>
          </Link>
        </div>

        <div className="card">
          <h2>📊 분석 모드</h2>
          <p>스윙 동작을 분석하고 개선점을 파악하세요.</p>
          <ul style={{ margin: '16px 0', paddingLeft: '20px' }}>
            <li>자세 분석</li>
            <li>각도 측정</li>
            <li>스윙 단계별 분석</li>
            <li>리포트 생성</li>
          </ul>
          <Link to="/analysis">
            <button className="btn btn-secondary">분석 시작</button>
          </Link>
        </div>

        <div className="card">
          <h2>👨‍🏫 코칭 모드</h2>
          <p>AI 코치의 맞춤형 코칭을 받으세요.</p>
          <ul style={{ margin: '16px 0', paddingLeft: '20px' }}>
            <li>맞춤형 코칭</li>
            <li>7일/30일 프로그램</li>
            <li>목표 설정</li>
            <li>진행 상황 추적</li>
          </ul>
          <Link to="/coaching">
            <button className="btn btn-success">코칭 시작</button>
          </Link>
        </div>

        <div className="card">
          <h2>📈 히스토리</h2>
          <p>과거 훈련 기록을 확인하고 성장을 추적하세요.</p>
          <ul style={{ margin: '16px 0', paddingLeft: '20px' }}>
            <li>훈련 기록 조회</li>
            <li>통계 분석</li>
            <li>성취도 확인</li>
            <li>레벨 및 포인트</li>
          </ul>
          <Link to="/history">
            <button className="btn">히스토리 보기</button>
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: '40px' }}>
        <h2>🌟 주요 기능</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <div>
            <h3>실시간 자세 분석</h3>
            <p>MediaPipe Pose를 사용한 0.1초 단위 관절 위치 계산</p>
          </div>
          <div>
            <h3>AI 코칭</h3>
            <p>백스윙·다운스윙·임팩트 구간별 피드백</p>
          </div>
          <div>
            <h3>적응 학습</h3>
            <p>사용자별 스윙 패턴 누적 및 맞춤형 피드백</p>
          </div>
          <div>
            <h3>음성/자막</h3>
            <p>Whisper + TTS를 사용한 실시간 코멘트</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

