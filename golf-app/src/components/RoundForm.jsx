// RoundForm.jsx
// 새 라운드(골프 한 판) 정보를 입력하는 폼이에요.
// 저장 버튼을 누르면 부모 컴포넌트(App.jsx)에 데이터를 전달해요.

import { useState } from 'react';

// 폼 초기 상태 — 빈 값으로 시작
const emptyForm = {
  date: '',
  course: '',
  totalStrokes: '',
  putts: '',
  fairwaysHit: '',
};

function RoundForm({ onSave, onCancel }) {
  // onSave: 저장 버튼 눌렀을 때 실행할 함수
  // onCancel: 취소 버튼 눌렀을 때 실행할 함수

  const [form, setForm] = useState(emptyForm); // 폼 데이터 상태
  const [error, setError] = useState('');       // 에러 메시지 상태

  // 입력칸 값이 바뀔 때마다 상태 업데이트
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    // ...form 은 기존 값을 유지하고 바뀐 항목만 업데이트해요
  }

  // 저장 버튼 클릭
  function handleSubmit(e) {
    e.preventDefault(); // 기본 페이지 새로고침 막기

    // 필수 항목 검사
    if (!form.date || !form.course || !form.totalStrokes) {
      setError('날짜, 골프장, 총 타수는 꼭 입력해주세요!');
      return;
    }

    // 숫자로 변환해서 전달
    onSave({
      id: Date.now().toString(), // 고유 id (현재 시간 이용)
      date: form.date,
      course: form.course,
      totalStrokes: Number(form.totalStrokes),
      putts: form.putts ? Number(form.putts) : null,
      fairwaysHit: form.fairwaysHit ? Number(form.fairwaysHit) : null,
    });

    setForm(emptyForm); // 폼 초기화
    setError('');
  }

  return (
    <div className="form-overlay">
      <div className="form-box">
        <h2 className="form-title">새 라운드 입력</h2>
        <form onSubmit={handleSubmit}>

          <label>날짜 *</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
          />

          <label>골프장 이름 *</label>
          <input
            type="text"
            name="course"
            placeholder="예: 그린밸리 CC"
            value={form.course}
            onChange={handleChange}
          />

          <label>총 타수 *</label>
          <input
            type="number"
            name="totalStrokes"
            placeholder="예: 92"
            min="40"
            max="200"
            value={form.totalStrokes}
            onChange={handleChange}
          />

          <label>퍼팅 수</label>
          <input
            type="number"
            name="putts"
            placeholder="예: 34"
            min="18"
            max="72"
            value={form.putts}
            onChange={handleChange}
          />

          <label>페어웨이 적중 홀 수</label>
          <input
            type="number"
            name="fairwaysHit"
            placeholder="예: 7 (14홀 중)"
            min="0"
            max="14"
            value={form.fairwaysHit}
            onChange={handleChange}
          />

          {error && <p className="form-error">{error}</p>}

          <div className="form-buttons">
            <button type="submit" className="btn-save">저장</button>
            <button type="button" className="btn-cancel" onClick={onCancel}>취소</button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default RoundForm;
