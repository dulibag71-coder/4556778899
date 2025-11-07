import React from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

function AnalysisMode() {
  return (
    <div className="container">
      <div className="header">
        <h1>📊 분석 모드</h1>
        <nav>
          <Link to="/">홈</Link>
          <Link to="/training">훈련 모드</Link>
          <Link to="/analysis">분석 모드</Link>
          <Link to="/coaching">코칭 모드</Link>
          <Link to="/history">히스토리</Link>
        </nav>
      </div>

      <div className="card">
        <h2>스윙 분석</h2>
        <p>분석 모드는 현재 개발 중입니다.</p>
        <p>곧 다음과 같은 기능이 제공될 예정입니다:</p>
        <ul style={{ marginTop: '16px', paddingLeft: '20px' }}>
          <li>동영상 업로드 및 분석</li>
          <li>자세 분석 리포트</li>
          <li>각도 측정 및 비교</li>
          <li>스윙 단계별 분석</li>
        </ul>
      </div>
    </div>
  )
}

export default AnalysisMode

