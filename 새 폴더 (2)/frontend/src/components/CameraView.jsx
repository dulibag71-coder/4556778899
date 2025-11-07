import React, { useEffect, useRef } from 'react'

function CameraView({ videoRef, isTraining }) {
  const canvasRef = useRef(null)

  return (
    <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: 'auto',
          display: isTraining ? 'block' : 'none'
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 'auto',
          display: 'none'
        }}
      />
      {!isTraining && (
        <div style={{
          padding: '80px 20px',
          textAlign: 'center',
          color: '#999'
        }}>
          카메라 미리보기가 여기에 표시됩니다.
          <br />
          훈련 시작 버튼을 눌러주세요.
        </div>
      )}
    </div>
  )
}

export default CameraView

