import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import PoseAnalyzer from '../components/PoseAnalyzer'
import FeedbackPanel from '../components/FeedbackPanel'
import CameraView from '../components/CameraView'

function TrainingMode() {
  const [isTraining, setIsTraining] = useState(false)
  const [mode, setMode] = useState('intermediate') // beginner, intermediate, professional
  const [feedback, setFeedback] = useState(null)
  const [sessionStats, setSessionStats] = useState({
    swingCount: 0,
    averageScore: 0,
    totalFrames: 0,
    lastSwingPhase: null
  })
  const videoRef = useRef(null)
  const wsRef = useRef(null)
  const stopCaptureRef = useRef(null)

  const startTraining = async () => {
    try {
      // 카메라 접근
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // WebSocket 연결
      const ws = new WebSocket('ws://localhost:8000/ws/pose-analysis')
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsTraining(true)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'analysis') {
          setFeedback(data.feedback)
          setSessionStats(prev => {
            const newTotalFrames = prev.totalFrames + 1
            const currentScore = data.feedback.posture_score?.score || 0
            const newAverageScore = (prev.averageScore * prev.totalFrames + currentScore) / newTotalFrames

            // 스윙 단계 변화 감지 (이전 단계와 다르고 현재 단계가 'setup'일 때 카운트)
            const currentPhase = data.pose_data.swing_phase
            const shouldIncrementSwing = prev.lastSwingPhase && prev.lastSwingPhase !== currentPhase && currentPhase === 'setup'

            return {
              ...prev,
              totalFrames: newTotalFrames,
              averageScore: newAverageScore,
              swingCount: shouldIncrementSwing ? prev.swingCount + 1 : prev.swingCount,
              lastSwingPhase: currentPhase
            }
          })
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket closed')
      }

      // 프레임 전송 시작
      stopCaptureRef.current = startFrameCapture(ws)

    } catch (error) {
      console.error('Error starting training:', error)
      alert('카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.')
    }
  }

  const startFrameCapture = (ws) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    let isCapturing = true
    let frameInterval = null

    const captureFrame = () => {
      if (!isCapturing) return
      
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        frameInterval = setTimeout(captureFrame, 100)
        return
      }

      try {
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)

        const frameData = canvas.toDataURL('image/jpeg', 0.8)
        
        if (ws.readyState === WebSocket.OPEN && isCapturing) {
          ws.send(JSON.stringify({
            type: 'frame',
            frame: frameData,
            timestamp: Date.now() / 1000,
            mode: mode
          }))
        }
      } catch (error) {
        console.error('Error capturing frame:', error)
      }

      // 100ms마다 프레임 전송 (약 10fps)
      if (isCapturing) {
        frameInterval = setTimeout(captureFrame, 100)
      }
    }

    captureFrame()

    // stopTraining 시 isCapturing을 false로 설정할 수 있도록 반환
    return () => {
      isCapturing = false
      if (frameInterval) {
        clearTimeout(frameInterval)
      }
    }
  }

  const stopTraining = () => {
    // 프레임 캡처 중지
    if (stopCaptureRef.current) {
      stopCaptureRef.current()
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'end_session' }))
      }
      wsRef.current.close()
    }

    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }

    setIsTraining(false)
    setFeedback(null)
  }

  useEffect(() => {
    return () => {
      stopTraining()
    }
  }, [])

  return (
    <div className="container">
      <div className="header">
        <h1>🏋️ 훈련 모드</h1>
        <nav>
          <Link to="/">홈</Link>
          <Link to="/training">훈련 모드</Link>
          <Link to="/analysis">분석 모드</Link>
          <Link to="/coaching">코칭 모드</Link>
          <Link to="/history">히스토리</Link>
        </nav>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '20px' }}>
        {/* 카메라 뷰 */}
        <div className="card">
          <h2>카메라 뷰</h2>
          <CameraView videoRef={videoRef} isTraining={isTraining} />
          
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label>
              난이도:
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value)}
                disabled={isTraining}
                style={{ marginLeft: '8px', padding: '8px', borderRadius: '4px' }}
              >
                <option value="beginner">초보</option>
                <option value="intermediate">중급</option>
                <option value="professional">프로</option>
              </select>
            </label>

            {!isTraining ? (
              <button className="btn" onClick={startTraining}>훈련 시작</button>
            ) : (
              <button className="btn btn-secondary" onClick={stopTraining}>훈련 중지</button>
            )}
          </div>

          {/* 세션 통계 */}
          <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3>세션 통계</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '12px' }}>
              <div>
                <strong>스윙 횟수:</strong> {sessionStats.swingCount}
              </div>
              <div>
                <strong>평균 점수:</strong> {sessionStats.averageScore.toFixed(1)}
              </div>
              <div>
                <strong>분석 프레임:</strong> {sessionStats.totalFrames}
              </div>
            </div>
          </div>
        </div>

        {/* 피드백 패널 */}
        <div className="card">
          <h2>AI 피드백</h2>
          <FeedbackPanel feedback={feedback} />
        </div>
      </div>
    </div>
  )
}

export default TrainingMode

