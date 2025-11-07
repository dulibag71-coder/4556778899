import React from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

function CoachingMode() {
  return (
    <div className="container">
      <div className="header">
        <h1>👨‍🏫 코칭 모드</h1>
        <nav>
          <Link to="/">홈</Link>
          <Link to="/training">훈련 모드</Link>
          <Link to="/analysis">분석 모드</Link>
          <Link to="/coaching">코칭 모드</Link>
          <Link to="/history">히스토리</Link>
        </nav>
      </div>

      <div className="card">
        <h2>AI 코칭 프로그램</h2>
        <p>코칭 모드는 현재 개발 중입니다.</p>
        <p>곧 다음과 같은 기능이 제공될 예정입니다:</p>
        <ul style={{ marginTop: '16px', paddingLeft: '20px' }}>
          <li>7일/30일 훈련 프로그램</li>
          <li>맞춤형 목표 설정</li>
          <li>일일 훈련 계획</li>
          <li>진행 상황 추적</li>
          <li>AI 코치 피드백</li>
        </ul>
      </div>
    </div>
  )
}

export default CoachingMode

