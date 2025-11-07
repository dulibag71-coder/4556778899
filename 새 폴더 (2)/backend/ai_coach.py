from typing import Dict, List, Optional
import json
import os
from datetime import datetime

class AICoach:
    """AI 골프 코치 - 피드백 생성 및 코칭"""
    
    def __init__(self):
        # 골프 자세 기준 각도 (이상적인 값)
        self.ideal_angles = {
            "beginner": {
                "left_elbow": 170.0,  # ±20도 허용
                "right_elbow": 170.0,
                "spine": 170.0,  # ±15도 허용
                "left_knee": 175.0,  # ±10도 허용
                "shoulder_rotation": 0.0,  # 스윙 단계별로 다름
            },
            "intermediate": {
                "left_elbow": 175.0,  # ±15도 허용
                "right_elbow": 175.0,
                "spine": 172.0,  # ±10도 허용
                "left_knee": 178.0,  # ±5도 허용
                "shoulder_rotation": 0.0,
            },
            "professional": {
                "left_elbow": 178.0,  # ±5도 허용
                "right_elbow": 178.0,
                "spine": 175.0,  # ±5도 허용
                "left_knee": 180.0,  # ±3도 허용
                "shoulder_rotation": 0.0,
            }
        }
        
        # 허용 오차 (난이도별)
        self.tolerance = {
            "beginner": 20.0,
            "intermediate": 15.0,
            "professional": 5.0
        }
        
        # 스윙 단계별 이상 각도
        self.swing_phase_angles = {
            "backswing": {
                "shoulder_rotation": -90.0,  # 백스윙 시 어깨 회전
                "left_elbow": 160.0,
            },
            "downswing": {
                "shoulder_rotation": 0.0,
                "left_elbow": 170.0,
            },
            "impact": {
                "shoulder_rotation": 45.0,
                "left_elbow": 175.0,
            },
            "follow_through": {
                "shoulder_rotation": 90.0,
                "left_elbow": 160.0,
            }
        }
    
    def generate_feedback(self, pose_data: Dict, mode: str = "intermediate", timestamp: float = 0.0) -> Dict:
        """자세 데이터를 기반으로 피드백 생성"""
        if not pose_data.get("detected"):
            return {
                "has_feedback": False,
                "message": "자세를 인식할 수 없습니다. 카메라 앞에 서주세요.",
                "severity": "info",
                "suggestions": []
            }
        
        angles = pose_data.get("angles", {})
        swing_phase = pose_data.get("swing_phase", "setup")
        posture_score = pose_data.get("posture_score", {})
        
        # 피드백 생성
        feedback_items = []
        severity = "info"
        
        # 각도별 피드백 체크
        for angle_name, current_angle in angles.items():
            feedback = self._check_angle(angle_name, current_angle, mode, swing_phase)
            if feedback:
                feedback_items.append(feedback)
                if feedback["severity"] == "error":
                    severity = "error"
                elif feedback["severity"] == "warning" and severity != "error":
                    severity = "warning"
        
        # 종합 피드백 메시지 생성
        if feedback_items:
            main_message = self._generate_main_message(feedback_items, swing_phase)
        else:
            main_message = "훌륭한 자세입니다! 좋은 스윙입니다!"
            severity = "success"
        
        return {
            "has_feedback": True,
            "message": main_message,
            "severity": severity,
            "details": feedback_items,
            "posture_score": posture_score,
            "swing_phase": swing_phase,
            "timestamp": timestamp,
            "suggestions": self._generate_suggestions(feedback_items, swing_phase)
        }
    
    def _check_angle(self, angle_name: str, current_angle: float, mode: str, swing_phase: str) -> Optional[Dict]:
        """개별 각도 체크"""
        # 스윙 단계별 목표 각도
        if swing_phase in self.swing_phase_angles and angle_name in self.swing_phase_angles[swing_phase]:
            ideal_angle = self.swing_phase_angles[swing_phase][angle_name]
        elif angle_name in self.ideal_angles[mode]:
            ideal_angle = self.ideal_angles[mode][angle_name]
        else:
            return None
        
        tolerance = self.tolerance[mode]
        difference = abs(current_angle - ideal_angle)
        
        if difference > tolerance:
            severity = "error" if difference > tolerance * 1.5 else "warning"
            
            # 피드백 메시지 생성
            message = self._get_angle_feedback_message(angle_name, current_angle, ideal_angle, difference)
            
            return {
                "angle_name": angle_name,
                "current_angle": current_angle,
                "ideal_angle": ideal_angle,
                "difference": difference,
                "message": message,
                "severity": severity
            }
        
        return None
    
    def _get_angle_feedback_message(self, angle_name: str, current: float, ideal: float, difference: float) -> str:
        """각도별 피드백 메시지"""
        messages = {
            "left_elbow": {
                "too_low": f"왼팔꿈치가 {difference:.1f}도 너무 구부러져 있습니다. 팔을 더 펴주세요.",
                "too_high": f"왼팔꿈치가 {difference:.1f}도 너무 펴져 있습니다. 자연스럽게 유지하세요."
            },
            "right_elbow": {
                "too_low": f"오른팔꿈치가 {difference:.1f}도 너무 구부러져 있습니다.",
                "too_high": f"오른팔꿈치가 {difference:.1f}도 너무 펴져 있습니다."
            },
            "spine": {
                "too_low": f"허리가 {difference:.1f}도 너무 앞으로 구부러져 있습니다. 허리를 펴주세요.",
                "too_high": f"허리가 {difference:.1f}도 너무 펴져 있습니다. 약간 숙여주세요."
            },
            "left_knee": {
                "too_low": f"무릎이 {difference:.1f}도 너무 구부러져 있습니다. 다리를 펴주세요.",
                "too_high": f"무릎이 {difference:.1f}도 너무 펴져 있습니다."
            },
            "shoulder_rotation": {
                "too_low": f"어깨 회전이 부족합니다. {abs(difference):.1f}도 더 회전하세요.",
                "too_high": f"어깨 회전이 과도합니다. {abs(difference):.1f}도 덜 회전하세요."
            }
        }
        
        if angle_name in messages:
            direction = "too_low" if current < ideal else "too_high"
            if direction in messages[angle_name]:
                return messages[angle_name][direction]
        
        return f"{angle_name} 각도가 이상적이지 않습니다. {difference:.1f}도 조정이 필요합니다."
    
    def _generate_main_message(self, feedback_items: List[Dict], swing_phase: str) -> str:
        """주요 피드백 메시지 생성"""
        error_items = [item for item in feedback_items if item["severity"] == "error"]
        warning_items = [item for item in feedback_items if item["severity"] == "warning"]
        
        if error_items:
            primary_issue = error_items[0]
            return primary_issue["message"]
        elif warning_items:
            primary_issue = warning_items[0]
            return primary_issue["message"]
        else:
            return "자세를 개선할 여지가 있습니다."
    
    def _generate_suggestions(self, feedback_items: List[Dict], swing_phase: str) -> List[str]:
        """개선 제안 생성"""
        suggestions = []
        
        for item in feedback_items[:3]:  # 최대 3개
            angle_name = item["angle_name"]
            difference = item["difference"]
            
            if angle_name == "left_elbow":
                if item["current_angle"] < item["ideal_angle"]:
                    suggestions.append(f"다음 스윙에서 왼팔을 {min(difference, 15):.0f}도 더 펴보세요.")
                else:
                    suggestions.append(f"왼팔을 약간 구부려서 자연스러운 자세를 유지하세요.")
            
            elif angle_name == "spine":
                suggestions.append("허리를 펴고 골반을 살짝 뒤로 빼는 자세를 유지하세요.")
            
            elif angle_name == "shoulder_rotation":
                if swing_phase == "backswing":
                    suggestions.append("백스윙 시 어깨를 더 회전시켜 코킹을 만드세요.")
                elif swing_phase == "downswing":
                    suggestions.append("다운스윙 시 힘을 빼고 자연스럽게 스윙하세요.")
        
        if not suggestions:
            suggestions.append("현재 자세를 유지하며 연습을 계속하세요.")
        
        return suggestions
    
    def get_swing_tips(self, swing_phase: str) -> List[str]:
        """스윙 단계별 팁 제공"""
        tips = {
            "setup": [
                "발을 어깨너비로 벌리고 서세요.",
                "무게중심을 발 앞쪽에 두세요.",
                "골프채를 자연스럽게 잡으세요."
            ],
            "backswing": [
                "왼팔을 펴고 천천히 백스윙하세요.",
                "어깨를 회전시켜 코킹을 만드세요.",
                "무게중심을 오른발로 이동하세요."
            ],
            "downswing": [
                "힘을 빼고 자연스럽게 다운스윙하세요.",
                "엉덩이를 먼저 회전시키세요.",
                "무게중심을 왼발로 이동하세요."
            ],
            "impact": [
                "팔을 펴고 임팩트 순간을 만드세요.",
                "몸통 회전과 함께 스윙하세요.",
                "공을 정확히 때리세요."
            ],
            "follow_through": [
                "팔로우스루를 완성하세요.",
                "균형을 유지하세요.",
                "자연스럽게 마무리하세요."
            ]
        }
        
        return tips.get(swing_phase, ["좋은 자세를 유지하세요."])

