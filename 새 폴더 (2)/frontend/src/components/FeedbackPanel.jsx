import React from 'react'

function FeedbackPanel({ feedback }) {
  if (!feedback) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
        피드백이 여기에 표시됩니다.
      </div>
    )
  }

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'error':
        return 'feedback-error'
      case 'warning':
        return 'feedback-warning'
      case 'success':
        return 'feedback-success'
      default:
        return 'feedback-info'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'success':
        return '✅'
      default:
        return 'ℹ️'
    }
  }

  return (
    <div>
      {/* 메인 피드백 메시지 */}
      <div className={getSeverityClass(feedback.severity)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>{getSeverityIcon(feedback.severity)}</span>
          <strong>{feedback.message}</strong>
        </div>
      </div>

      {/* 자세 점수 */}
      {feedback.posture_score && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>자세 점수:</span>
            <strong style={{ fontSize: '24px', color: '#667eea' }}>
              {feedback.posture_score.score.toFixed(1)}점
            </strong>
          </div>
          <div style={{ marginTop: '8px' }}>
            등급: <strong>{feedback.posture_score.grade}</strong>
          </div>
        </div>
      )}

      {/* 스윙 단계 */}
      {feedback.swing_phase && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#e3f2fd', borderRadius: '8px' }}>
          <strong>스윙 단계:</strong> {feedback.swing_phase}
        </div>
      )}

      {/* 개선 제안 */}
      {feedback.suggestions && feedback.suggestions.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h3>💡 개선 제안</h3>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            {feedback.suggestions.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 상세 피드백 */}
      {feedback.details && feedback.details.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h3>상세 분석</h3>
          <div style={{ marginTop: '8px' }}>
            {feedback.details.map((detail, index) => (
              <div key={index} style={{ 
                marginBottom: '8px', 
                padding: '8px', 
                background: '#f9f9f9', 
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <strong>{detail.angle_name}:</strong> {detail.message}
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                  현재: {detail.current_angle.toFixed(1)}° | 
                  목표: {detail.ideal_angle.toFixed(1)}° | 
                  차이: {detail.difference.toFixed(1)}°
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedbackPanel

