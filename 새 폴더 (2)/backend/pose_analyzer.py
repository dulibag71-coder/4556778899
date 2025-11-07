import cv2
import numpy as np
import mediapipe as mp
from typing import Dict, List, Optional, Tuple
import math

class PoseAnalyzer:
    """골프 스윙 자세 분석기"""
    
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            model_complexity=2,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        
        # 관절 인덱스 (MediaPipe)
        self.LANDMARKS = {
            'LEFT_SHOULDER': 11,
            'RIGHT_SHOULDER': 12,
            'LEFT_ELBOW': 13,
            'RIGHT_ELBOW': 14,
            'LEFT_WRIST': 15,
            'RIGHT_WRIST': 16,
            'LEFT_HIP': 23,
            'RIGHT_HIP': 24,
            'LEFT_KNEE': 25,
            'RIGHT_KNEE': 26,
            'LEFT_ANKLE': 27,
            'RIGHT_ANKLE': 28,
            'NOSE': 0,
            'LEFT_EYE': 2,
            'RIGHT_EYE': 5,
        }
        
    def analyze_pose(self, frame: np.ndarray) -> Dict:
        """프레임에서 자세 분석"""
        # BGR to RGB 변환
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # MediaPipe 포즈 추정
        results = self.pose.process(rgb_frame)
        
        if not results.pose_landmarks:
            return {
                "detected": False,
                "landmarks": None,
                "angles": None,
                "swing_phase": "none"
            }
        
        # 랜드마크 추출
        landmarks = self._extract_landmarks(results.pose_landmarks)
        
        # 각도 계산
        angles = self._calculate_angles(landmarks)
        
        # 스윙 단계 판별
        swing_phase = self._detect_swing_phase(landmarks, angles)
        
        # 골프 자세 평가
        posture_score = self._evaluate_posture(landmarks, angles)
        
        return {
            "detected": True,
            "landmarks": landmarks,
            "angles": angles,
            "swing_phase": swing_phase,
            "posture_score": posture_score,
            "timestamp": None
        }
    
    def analyze_pose_from_data(self, frame_data: Dict) -> Dict:
        """프레임 데이터에서 자세 분석 (직렬화된 데이터용)"""
        # 이미 구현된 analyze_pose 사용
        # frame_data가 이미지인 경우
        if "frame" in frame_data:
            frame = np.array(frame_data["frame"])
            return self.analyze_pose(frame)
        return {"detected": False}
    
    def _extract_landmarks(self, pose_landmarks) -> Dict[str, Tuple[float, float, float]]:
        """랜드마크 좌표 추출"""
        landmarks = {}
        for name, idx in self.LANDMARKS.items():
            landmark = pose_landmarks.landmark[idx]
            landmarks[name] = (landmark.x, landmark.y, landmark.z)
        return landmarks
    
    def _calculate_angle(self, point1: Tuple, point2: Tuple, point3: Tuple) -> float:
        """세 점 사이의 각도 계산"""
        # 벡터 생성
        vec1 = np.array([point1[0] - point2[0], point1[1] - point2[1]])
        vec2 = np.array([point3[0] - point2[0], point3[1] - point2[1]])
        
        # 각도 계산 (라디안 → 도)
        cos_angle = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2) + 1e-6)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        angle = np.arccos(cos_angle) * 180 / np.pi
        return angle
    
    def _calculate_angles(self, landmarks: Dict) -> Dict[str, float]:
        """주요 관절 각도 계산"""
        angles = {}
        
        try:
            # 왼쪽 어깨 각도
            if all(k in landmarks for k in ['LEFT_HIP', 'LEFT_SHOULDER', 'LEFT_ELBOW']):
                angles['left_shoulder'] = self._calculate_angle(
                    landmarks['LEFT_HIP'],
                    landmarks['LEFT_SHOULDER'],
                    landmarks['LEFT_ELBOW']
                )
            
            # 오른쪽 어깨 각도
            if all(k in landmarks for k in ['RIGHT_HIP', 'RIGHT_SHOULDER', 'RIGHT_ELBOW']):
                angles['right_shoulder'] = self._calculate_angle(
                    landmarks['RIGHT_HIP'],
                    landmarks['RIGHT_SHOULDER'],
                    landmarks['RIGHT_ELBOW']
                )
            
            # 왼쪽 팔꿈치 각도
            if all(k in landmarks for k in ['LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST']):
                angles['left_elbow'] = self._calculate_angle(
                    landmarks['LEFT_SHOULDER'],
                    landmarks['LEFT_ELBOW'],
                    landmarks['LEFT_WRIST']
                )
            
            # 오른쪽 팔꿈치 각도
            if all(k in landmarks for k in ['RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST']):
                angles['right_elbow'] = self._calculate_angle(
                    landmarks['RIGHT_SHOULDER'],
                    landmarks['RIGHT_ELBOW'],
                    landmarks['RIGHT_WRIST']
                )
            
            # 허리 각도 (어깨-엉덩이-무릎)
            if all(k in landmarks for k in ['LEFT_SHOULDER', 'LEFT_HIP', 'LEFT_KNEE']):
                angles['spine'] = self._calculate_angle(
                    landmarks['LEFT_SHOULDER'],
                    landmarks['LEFT_HIP'],
                    landmarks['LEFT_KNEE']
                )
            
            # 무릎 각도
            if all(k in landmarks for k in ['LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE']):
                angles['left_knee'] = self._calculate_angle(
                    landmarks['LEFT_HIP'],
                    landmarks['LEFT_KNEE'],
                    landmarks['LEFT_ANKLE']
                )
            
            # 스윙 회전 각도 (어깨 회전)
            if all(k in landmarks for k in ['LEFT_SHOULDER', 'NOSE', 'RIGHT_SHOULDER']):
                shoulder_angle = self._calculate_shoulder_rotation(
                    landmarks['LEFT_SHOULDER'],
                    landmarks['RIGHT_SHOULDER'],
                    landmarks['NOSE']
                )
                angles['shoulder_rotation'] = shoulder_angle
            
        except Exception as e:
            print(f"Angle calculation error: {e}")
        
        return angles
    
    def _calculate_shoulder_rotation(self, left_shoulder: Tuple, right_shoulder: Tuple, nose: Tuple) -> float:
        """어깨 회전 각도 계산"""
        # 어깨 중심점
        shoulder_center = (
            (left_shoulder[0] + right_shoulder[0]) / 2,
            (left_shoulder[1] + right_shoulder[1]) / 2
        )
        
        # 코에서 어깨 중심까지의 벡터
        vec = (nose[0] - shoulder_center[0], nose[1] - shoulder_center[1])
        
        # 수평선과의 각도
        angle = math.atan2(vec[1], vec[0]) * 180 / math.pi
        return angle
    
    def _detect_swing_phase(self, landmarks: Dict, angles: Dict) -> str:
        """스윙 단계 판별"""
        # 간단한 휴리스틱 기반 판별
        if 'shoulder_rotation' in angles:
            rotation = angles['shoulder_rotation']
            
            if rotation < -45:
                return "backswing"  # 백스윙
            elif rotation > 45:
                return "downswing"  # 다운스윙
            elif -45 <= rotation <= 45:
                return "impact"  # 임팩트
            else:
                return "follow_through"  # 팔로우스루
        
        return "setup"  # 설정 자세
    
    def _evaluate_posture(self, landmarks: Dict, angles: Dict) -> Dict:
        """자세 평가"""
        score = 100
        issues = []
        
        # 팔꿈치 각도 체크 (골프 스윙 시 팔꿈치는 약 160-180도가 이상적)
        if 'left_elbow' in angles:
            elbow_angle = angles['left_elbow']
            if elbow_angle < 150:
                score -= 20
                issues.append("왼팔이 너무 구부러져 있습니다.")
            elif elbow_angle > 180:
                score -= 15
                issues.append("왼팔이 너무 펴져 있습니다.")
        
        # 허리 각도 체크
        if 'spine' in angles:
            spine_angle = angles['spine']
            if spine_angle < 160:
                score -= 15
                issues.append("허리가 너무 앞으로 구부러져 있습니다.")
        
        # 무릎 각도 체크
        if 'left_knee' in angles:
            knee_angle = angles['left_knee']
            if knee_angle < 160:
                score -= 10
                issues.append("무릎이 너무 구부러져 있습니다.")
        
        return {
            "score": max(0, score),
            "issues": issues,
            "grade": self._get_grade(score)
        }
    
    def _get_grade(self, score: float) -> str:
        """점수에 따른 등급"""
        if score >= 90:
            return "Excellent"
        elif score >= 75:
            return "Good"
        elif score >= 60:
            return "Fair"
        else:
            return "Poor"
    
    def draw_pose(self, frame: np.ndarray, landmarks: Dict, angles: Dict) -> np.ndarray:
        """자세 오버레이 그리기"""
        # MediaPipe drawing 사용
        # 실제로는 pose_landmarks 객체가 필요하지만,
        # 여기서는 간단히 각도 정보를 텍스트로 표시
        frame_copy = frame.copy()
        
        if angles:
            y_offset = 30
            for angle_name, angle_value in angles.items():
                cv2.putText(
                    frame_copy,
                    f"{angle_name}: {angle_value:.1f}°",
                    (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2
                )
                y_offset += 25
        
        return frame_copy

