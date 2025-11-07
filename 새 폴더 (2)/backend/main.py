from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import cv2
import numpy as np
import mediapipe as mp
import json
import asyncio
import base64
from typing import List, Optional
from pydantic import BaseModel
import logging
from datetime import datetime
import os

from ai_coach import AICoach
from pose_analyzer import PoseAnalyzer
from training_session import TrainingSession
from report_generator import ReportGenerator
from database import Database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GolfLink AI Coach API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 리포트 파일 서빙
if os.path.exists("reports"):
    app.mount("/api/reports", StaticFiles(directory="reports"), name="reports")

# 전역 변수
pose_analyzer = PoseAnalyzer()
ai_coach = AICoach()
db = Database()
report_generator = ReportGenerator()

class TrainingMode(BaseModel):
    mode: str  # "beginner", "intermediate", "professional"
    duration: int  # minutes

class FeedbackRequest(BaseModel):
    frame_data: dict
    timestamp: float
    user_id: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "GolfLink AI Coach API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws/pose-analysis")
async def websocket_pose_analysis(websocket: WebSocket):
    """실시간 자세 분석 WebSocket"""
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    session = TrainingSession()
    
    try:
        while True:
            # 프론트엔드에서 프레임 데이터 수신
            data = await websocket.receive_json()
            
            if data.get("type") == "frame":
                frame_base64 = data.get("frame")
                timestamp = data.get("timestamp", 0)
                mode = data.get("mode", "intermediate")
                
                # Base64 이미지 디코딩
                image_data = base64.b64decode(frame_base64.split(",")[1])
                nparr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                # 자세 분석
                pose_results = pose_analyzer.analyze_pose(frame)
                
                # AI 코칭 피드백 생성
                feedback = ai_coach.generate_feedback(
                    pose_results, 
                    mode=mode,
                    timestamp=timestamp
                )
                
                # 세션 데이터 기록
                session.add_frame(pose_results, feedback, timestamp)
                
                # 결과 전송
                await websocket.send_json({
                    "type": "analysis",
                    "pose_data": pose_results,
                    "feedback": feedback,
                    "timestamp": timestamp
                })
            
            elif data.get("type") == "end_session":
                # 세션 종료 및 리포트 생성
                session_data = session.get_session_data()
                report_url = await report_generator.generate_report(session_data)
                
                await websocket.send_json({
                    "type": "session_end",
                    "report_url": report_url,
                    "summary": session_data.get("summary", {})
                })
                break
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })

@app.post("/api/analyze-frame")
async def analyze_frame(request: FeedbackRequest):
    """단일 프레임 분석"""
    try:
        # 자세 분석
        pose_results = pose_analyzer.analyze_pose_from_data(request.frame_data)
        
        # AI 피드백 생성
        feedback = ai_coach.generate_feedback(pose_results)
        
        return JSONResponse({
            "pose_data": pose_results,
            "feedback": feedback,
            "timestamp": request.timestamp
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/training/start")
async def start_training(training_mode: TrainingMode):
    """훈련 세션 시작"""
    session_id = db.create_training_session(
        user_id="default",
        mode=training_mode.mode,
        duration=training_mode.duration
    )
    return {"session_id": session_id, "status": "started"}

@app.get("/api/training/session/{session_id}")
async def get_session(session_id: str):
    """훈련 세션 정보 조회"""
    session = db.get_training_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/api/training/user/{user_id}/history")
async def get_training_history(user_id: str):
    """사용자 훈련 이력 조회"""
    history = db.get_user_history(user_id)
    return {"history": history}

@app.post("/api/report/generate")
async def generate_report(session_id: str):
    """훈련 리포트 생성"""
    session_data = db.get_training_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # 세션 데이터에서 session_data JSON 파싱
    if isinstance(session_data.get("session_data"), str):
        session_data_dict = json.loads(session_data["session_data"])
    else:
        session_data_dict = session_data.get("session_data", session_data)
    
    report_url = await report_generator.generate_report(session_data_dict)
    return {"report_url": report_url}

@app.get("/api/user/{user_id}/stats")
async def get_user_stats(user_id: str):
    """사용자 통계 조회"""
    stats = db.get_user_stats(user_id)
    return stats

@app.get("/api/user/{user_id}/achievements")
async def get_achievements(user_id: str):
    """사용자 성취도 조회"""
    achievements = db.get_user_achievements(user_id)
    return achievements

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

