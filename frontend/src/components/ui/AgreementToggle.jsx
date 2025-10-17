/**
 * @개요 iOS 스타일 토글 스위치 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @매개변수 {boolean} props.checked - 토글 상태
 * @매개변수 {function} props.onChange - 토글 변경 핸들러
 * @매개변수 {string} props.label - 토글 레이블
 * @반환값 {JSX.Element} 토글 스위치 컴포넌트
 */

import './AgreementToggle.scss';

const AgreementToggle = ({ checked, onChange, label }) => {
  return (
    <div className="agreement-toggle">
      <label className="toggle-label">
        <span className="toggle-text">{label}</span>
        <div className="toggle-switch">
          <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
          />
          <span className="toggle-slider"></span>
        </div>
      </label>
    </div>
  );
};

export default AgreementToggle;
