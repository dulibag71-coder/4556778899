from typing import Dict, List, Optional
from datetime import datetime
import json

class TrainingSession:
    """훈련 세션 관리"""
    
    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.start_time = datetime.now()
        self.frames: List[Dict] = []
        self.feedback_history: List[Dict] = []
        self.swing_count = 0
        self.total_score = 0
        self.average_score = 0
    
    def add_frame(self, pose_data: Dict, feedback: Dict, timestamp: float):
        """프레임 데이터 추가"""
        frame_record = {
            "timestamp": timestamp,
            "pose_data": pose_data,
            "feedback": feedback,
            "datetime": datetime.now().isoformat()
        }
        self.frames.append(frame_record)
        self.feedback_history.append(feedback)
        
        # 스윙 카운트 (스윙 단계 변경 감지)
        if len(self.frames) > 1:
            prev_phase = self.frames[-2]["pose_data"].get("swing_phase")
            curr_phase = pose_data.get("swing_phase")
            if prev_phase != curr_phase and curr_phase == "setup":
                self.swing_count += 1
        
        # 점수 업데이트
        if feedback.get("posture_score"):
            score = feedback["posture_score"].get("score", 0)
            self.total_score += score
            self.average_score = self.total_score / len(self.frames) if self.frames else 0
    
    def get_session_data(self) -> Dict:
        """세션 데이터 반환"""
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        # 통계 계산
        error_count = sum(1 for f in self.feedback_history if f.get("severity") == "error")
        warning_count = sum(1 for f in self.feedback_history if f.get("severity") == "warning")
        success_count = sum(1 for f in self.feedback_history if f.get("severity") == "success")
        
        # 스윙 단계별 분석
        swing_phases = {}
        for frame in self.frames:
            phase = frame["pose_data"].get("swing_phase", "unknown")
            if phase not in swing_phases:
                swing_phases[phase] = []
            swing_phases[phase].append(frame)
        
        return {
            "session_id": self.session_id,
            "start_time": self.start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration": duration,
            "total_frames": len(self.frames),
            "swing_count": self.swing_count,
            "average_score": self.average_score,
            "total_score": self.total_score,
            "feedback_stats": {
                "error": error_count,
                "warning": warning_count,
                "success": success_count
            },
            "swing_phases": {phase: len(frames) for phase, frames in swing_phases.items()},
            "frames": self.frames,
            "summary": {
                "overall_score": self.average_score,
                "improvement_areas": self._get_improvement_areas(),
                "strengths": self._get_strengths()
            }
        }
    
    def _get_improvement_areas(self) -> List[str]:
        """개선 영역 식별"""
        improvement_areas = []
        
        # 가장 많이 발생한 에러 분석
        error_angles = {}
        for feedback in self.feedback_history:
            if feedback.get("severity") == "error":
                for detail in feedback.get("details", []):
                    angle_name = detail.get("angle_name")
                    if angle_name:
                        error_angles[angle_name] = error_angles.get(angle_name, 0) + 1
        
        # 가장 많이 문제가 된 각도
        if error_angles:
            sorted_angles = sorted(error_angles.items(), key=lambda x: x[1], reverse=True)
            for angle_name, count in sorted_angles[:3]:
                improvement_areas.append(f"{angle_name} (문제 발생 {count}회)")
        
        return improvement_areas if improvement_areas else ["전반적인 자세 유지"]
    
    def _get_strengths(self) -> List[str]:
        """강점 식별"""
        strengths = []
        
        success_count = sum(1 for f in self.feedback_history if f.get("severity") == "success")
        if success_count > len(self.feedback_history) * 0.5:
            strengths.append("일관된 자세 유지")
        
        # 스윙 단계별 성공률
        phase_success = {}
        for frame in self.frames:
            phase = frame["pose_data"].get("swing_phase")
            if phase and frame["feedback"].get("severity") == "success":
                phase_success[phase] = phase_success.get(phase, 0) + 1
        
        if phase_success:
            best_phase = max(phase_success.items(), key=lambda x: x[1])
            strengths.append(f"{best_phase[0]} 단계가 우수함")
        
        return strengths if strengths else ["계속해서 연습하세요"]
    
    def end_session(self):
        """세션 종료"""
        return self.get_session_data()

