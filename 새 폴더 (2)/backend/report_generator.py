from typing import Dict, Tuple
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime
import os
import json

class ReportGenerator:
    """훈련 리포트 생성기"""
    
    def __init__(self, output_dir: str = "reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """커스텀 스타일 설정"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=30,
            alignment=1  # Center
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#34495e'),
            spaceAfter=12
        ))
    
    async def generate_report(self, session_data: Dict) -> str:
        """PDF 리포트 생성"""
        session_id = session_data.get("session_id", "unknown")
        filename = f"report_{session_id}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        # PDF 생성
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        
        # 제목
        title = Paragraph("GolfLink AI Coach - 훈련 리포트", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 0.3*inch))
        
        # 세션 정보
        story.append(self._create_session_info(session_data))
        story.append(Spacer(1, 0.2*inch))
        
        # 통계 요약
        summary_heading, summary_content = self._create_statistics_summary(session_data)
        story.append(summary_heading)
        story.append(summary_content)
        story.append(Spacer(1, 0.2*inch))
        
        # 스윙 분석
        swing_heading, swing_table = self._create_swing_analysis(session_data)
        story.append(swing_heading)
        story.append(swing_table)
        story.append(Spacer(1, 0.2*inch))
        
        # 개선 영역
        improvement_heading, improvement_content = self._create_improvement_areas(session_data)
        story.append(improvement_heading)
        story.append(improvement_content)
        story.append(Spacer(1, 0.2*inch))
        
        # 강점
        strengths_heading, strengths_content = self._create_strengths(session_data)
        story.append(strengths_heading)
        story.append(strengths_content)
        
        # PDF 빌드
        doc.build(story)
        
        return f"/api/reports/{filename}"
    
    def _create_session_info(self, session_data: Dict) -> Table:
        """세션 정보 테이블"""
        data = [
            ['세션 ID', session_data.get("session_id", "N/A")],
            ['시작 시간', session_data.get("start_time", "N/A")],
            ['종료 시간', session_data.get("end_time", "N/A")],
            ['훈련 시간', f"{session_data.get('duration', 0):.1f}초"],
            ['총 스윙 횟수', str(session_data.get("swing_count", 0))],
            ['분석 프레임 수', str(session_data.get("total_frames", 0))],
        ]
        
        table = Table(data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (1, 0), (1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        return table
    
    def _create_statistics_summary(self, session_data: Dict) -> Tuple[Paragraph, Paragraph]:
        """통계 요약"""
        summary = session_data.get("summary", {})
        stats = session_data.get("feedback_stats", {})
        
        text = f"""
        <b>전체 점수:</b> {summary.get('overall_score', 0):.1f}점<br/>
        <b>성공:</b> {stats.get('success', 0)}회 | 
        <b>경고:</b> {stats.get('warning', 0)}회 | 
        <b>오류:</b> {stats.get('error', 0)}회
        """
        
        heading = Paragraph("통계 요약", self.styles['CustomHeading'])
        content = Paragraph(text, self.styles['Normal'])
        
        return heading, content
    
    def _create_swing_analysis(self, session_data: Dict) -> Tuple[Paragraph, Table]:
        """스윙 분석 테이블"""
        swing_phases = session_data.get("swing_phases", {})
        
        data = [['스윙 단계', '프레임 수', '비율']]
        total_frames = session_data.get("total_frames", 1)
        
        for phase, count in swing_phases.items():
            percentage = (count / total_frames) * 100
            data.append([phase, str(count), f"{percentage:.1f}%"])
        
        table = Table(data, colWidths=[2*inch, 2*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        heading = Paragraph("스윙 단계별 분석", self.styles['CustomHeading'])
        return heading, table
    
    def _create_improvement_areas(self, session_data: Dict) -> Tuple[Paragraph, Paragraph]:
        """개선 영역"""
        summary = session_data.get("summary", {})
        areas = summary.get("improvement_areas", [])
        
        text = "<br/>".join([f"• {area}" for area in areas]) if areas else "개선할 영역이 없습니다."
        
        heading = Paragraph("개선 영역", self.styles['CustomHeading'])
        content = Paragraph(text, self.styles['Normal'])
        
        return heading, content
    
    def _create_strengths(self, session_data: Dict) -> Tuple[Paragraph, Paragraph]:
        """강점"""
        summary = session_data.get("summary", {})
        strengths = summary.get("strengths", [])
        
        text = "<br/>".join([f"• {strength}" for strength in strengths]) if strengths else "계속해서 연습하세요."
        
        heading = Paragraph("강점", self.styles['CustomHeading'])
        content = Paragraph(text, self.styles['Normal'])
        
        return heading, content

