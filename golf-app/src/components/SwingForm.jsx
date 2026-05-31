// SwingForm.jsx
// 스윙 연습 결과를 입력하는 폼이에요.
// 클럽 종류, 클럽 스피드, 비거리 같은 숫자를 기록해요.

import { useState } from 'react';

const CLUBS = ['드라이버', '3번 우드', '5번 우드', '4번 아이언', '5번 아이언', '6번 아이언', '7번 아이언', '8번 아이언', '9번 아이언', '피칭 웨지', '샌드 웨지'];

const empty = {
  date: '',
  club: '드라이버',
  clubSpeed: '',   // 클럽 헤드 스피드 (km/h)
  ballSpeed: '',   // 볼 스피드 (km/h)
  carry: '',       // 비거리 (m)
  launchAngle: '', // 런치 앵글 (도)
  spinRate: '',    // 스핀량 (rpm)
  memo: '',
};

function SwingForm({ onSave, onCancel }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.date || !form.club || !form.carry) {
      setError('날짜, 클럽, 비거리는 꼭 입력해주세요!');
      return;
    }
    onSave({
      id: Date.now().toString(),
      date: form.date,
      club: form.club,
      clubSpeed: form.clubSpeed ? Number(form.clubSpeed) : null,
      ballSpeed: form.ballSpeed ? Number(form.ballSpeed) : null,
      carry: Number(form.carry),
      launchAngle: form.launchAngle ? Number(form.launchAngle) : null,
      spinRate: form.spinRate ? Number(form.spinRate) : null,
      memo: form.memo,
    });
    setForm(empty);
    setError('');
  }

  return (
    <div className="form-overlay">
      <div className="form-box swing-form-box">
        <h2 className="form-title">스윙 기록 입력</h2>
        <form onSubmit={handleSubmit}>

          <div className="form-row-2">
            <div>
              <label>날짜 *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} />
            </div>
            <div>
              <label>클럽 *</label>
              <select name="club" value={form.club} onChange={handleChange} className="form-select">
                {CLUBS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label>클럽 스피드 (km/h)</label>
              <input type="number" name="clubSpeed" placeholder="예: 158" min="60" max="250" value={form.clubSpeed} onChange={handleChange} />
            </div>
            <div>
              <label>볼 스피드 (km/h)</label>
              <input type="number" name="ballSpeed" placeholder="예: 220" min="80" max="340" value={form.ballSpeed} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label>비거리 (m) *</label>
              <input type="number" name="carry" placeholder="예: 210" min="30" max="400" value={form.carry} onChange={handleChange} />
            </div>
            <div>
              <label>런치 앵글 (°)</label>
              <input type="number" name="launchAngle" placeholder="예: 12" min="0" max="45" step="0.1" value={form.launchAngle} onChange={handleChange} />
            </div>
          </div>

          <label>스핀량 (rpm)</label>
          <input type="number" name="spinRate" placeholder="드라이버 기준 2000~3200rpm" min="500" max="12000" value={form.spinRate} onChange={handleChange} />

          <label>메모</label>
          <input type="text" name="memo" placeholder="예: 임팩트 때 손목 고정 연습" value={form.memo} onChange={handleChange} />

          {error && <p className="form-error">{error}</p>}

          <div className="form-buttons">
            <button type="submit" className="btn-save">저장 & 분석</button>
            <button type="button" className="btn-cancel" onClick={onCancel}>취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SwingForm;
