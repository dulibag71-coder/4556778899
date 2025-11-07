import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import '../App.css'

function History() {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      // 사용자 ID는 임시로 'default' 사용
      const userId = 'default'
      
      const [statsResponse, historyResponse] = await Promise.all([
        axios.get(`http://localhost:8000/api/user/${userId}/stats`),
        axios.get(`http://localhost:8000/api/training/user/${userId}/history`)
      ])

      setStats(statsResponse.data)
      setHistory(historyResponse.data.history || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📈 훈련 히스토리</h1>
        <nav>
          <Link to="/">홈</Link>
          <Link to="/training">훈련 모드</Link>
          <Link to="/analysis">분석 모드</Link>
          <Link to="/coaching">코칭 모드</Link>
          <Link to="/history">히스토리</Link>
        </nav>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <div className="card">
            <h3>총 훈련 횟수</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea', marginTop: '8px' }}>
              {stats.total_sessions}
            </p>
          </div>
          <div className="card">
            <h3>평균 점수</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea', marginTop: '8px' }}>
              {stats.average_score.toFixed(1)}
            </p>
          </div>
          <div className="card">
            <h3>총 스윙 횟수</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea', marginTop: '8px' }}>
              {stats.total_swings}
            </p>
          </div>
          <div className="card">
            <h3>최근 훈련</h3>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              {stats.last_training ? new Date(stats.last_training).toLocaleDateString('ko-KR') : '없음'}
            </p>
          </div>
        </div>
      )}

      {/* 훈련 기록 목록 */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h2>훈련 기록</h2>
        {history.length === 0 ? (
          <p>아직 훈련 기록이 없습니다.</p>
        ) : (
          <div style={{ marginTop: '16px' }}>
            {history.map((session) => (
              <div key={session.session_id} style={{
                padding: '16px',
                marginBottom: '12px',
                background: '#f5f5f5',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{session.mode}</strong>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    {new Date(session.start_time).toLocaleString('ko-KR')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>평균 점수: <strong>{session.average_score?.toFixed(1) || 0}</strong></div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    스윙: {session.swing_count || 0}회
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default History

