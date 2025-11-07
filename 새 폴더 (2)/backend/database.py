from typing import Dict, List, Optional
from datetime import datetime
import sqlite3
import json
import os

class Database:
    """데이터베이스 관리"""
    
    def __init__(self, db_path: str = "golflink.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """데이터베이스 초기화"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 사용자 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                username TEXT,
                email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                level INTEGER DEFAULT 1,
                points INTEGER DEFAULT 0,
                consecutive_days INTEGER DEFAULT 0,
                last_training_date DATE
            )
        ''')
        
        # 훈련 세션 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS training_sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT,
                mode TEXT,
                duration INTEGER,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                total_frames INTEGER,
                swing_count INTEGER,
                average_score REAL,
                session_data TEXT,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # 성취도 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS achievements (
                achievement_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                achievement_type TEXT,
                achievement_name TEXT,
                achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_user(self, user_id: str, username: str, email: str = "") -> bool:
        """사용자 생성"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO users (user_id, username, email)
                VALUES (?, ?, ?)
            ''', (user_id, username, email))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False
        finally:
            conn.close()
    
    def get_user(self, user_id: str) -> Optional[Dict]:
        """사용자 정보 조회"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    def create_training_session(self, user_id: str, mode: str, duration: int) -> str:
        """훈련 세션 생성"""
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id}"
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO training_sessions 
            (session_id, user_id, mode, duration, start_time, total_frames, swing_count, average_score)
            VALUES (?, ?, ?, ?, ?, 0, 0, 0.0)
        ''', (session_id, user_id, mode, duration, datetime.now()))
        
        conn.commit()
        conn.close()
        
        return session_id
    
    def update_training_session(self, session_id: str, session_data: Dict):
        """훈련 세션 업데이트"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE training_sessions
            SET end_time = ?,
                total_frames = ?,
                swing_count = ?,
                average_score = ?,
                session_data = ?
            WHERE session_id = ?
        ''', (
            datetime.now(),
            session_data.get("total_frames", 0),
            session_data.get("swing_count", 0),
            session_data.get("average_score", 0),
            json.dumps(session_data),
            session_id
        ))
        
        conn.commit()
        conn.close()
    
    def get_training_session(self, session_id: str) -> Optional[Dict]:
        """훈련 세션 조회"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM training_sessions WHERE session_id = ?', (session_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            data = dict(row)
            if data.get("session_data"):
                data["session_data"] = json.loads(data["session_data"])
            return data
        return None
    
    def get_user_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        """사용자 훈련 이력 조회"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM training_sessions
            WHERE user_id = ?
            ORDER BY start_time DESC
            LIMIT ?
        ''', (user_id, limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def get_user_stats(self, user_id: str) -> Dict:
        """사용자 통계 조회"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 총 훈련 횟수
        cursor.execute('SELECT COUNT(*) FROM training_sessions WHERE user_id = ?', (user_id,))
        total_sessions = cursor.fetchone()[0]
        
        # 평균 점수
        cursor.execute('SELECT AVG(average_score) FROM training_sessions WHERE user_id = ?', (user_id,))
        avg_score = cursor.fetchone()[0] or 0
        
        # 총 스윙 횟수
        cursor.execute('SELECT SUM(swing_count) FROM training_sessions WHERE user_id = ?', (user_id,))
        total_swings = cursor.fetchone()[0] or 0
        
        # 최근 훈련일
        cursor.execute('''
            SELECT MAX(start_time) FROM training_sessions WHERE user_id = ?
        ''', (user_id,))
        last_training = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "total_sessions": total_sessions,
            "average_score": round(avg_score, 2),
            "total_swings": total_swings,
            "last_training": last_training
        }
    
    def get_user_achievements(self, user_id: str) -> List[Dict]:
        """사용자 성취도 조회"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM achievements
            WHERE user_id = ?
            ORDER BY achieved_at DESC
        ''', (user_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def add_achievement(self, user_id: str, achievement_type: str, achievement_name: str):
        """성취도 추가"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO achievements (user_id, achievement_type, achievement_name)
            VALUES (?, ?, ?)
        ''', (user_id, achievement_type, achievement_name))
        
        conn.commit()
        conn.close()
    
    def update_user_points(self, user_id: str, points: int):
        """사용자 포인트 업데이트"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users
            SET points = points + ?
            WHERE user_id = ?
        ''', (points, user_id))
        
        conn.commit()
        conn.close()
    
    def update_user_level(self, user_id: str, level: int):
        """사용자 레벨 업데이트"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users
            SET level = ?
            WHERE user_id = ?
        ''', (level, user_id))
        
        conn.commit()
        conn.close()

