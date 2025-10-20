/**
 * @개요 개인 학습 사이드바 컴포넌트 (임시 구현)
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {function} props.onClose - 사이드바 닫기 함수
 * @매개변수 {boolean} props.isOpen - 사이드바 열림 상태
 * @반환값 {JSX.Element} 개인 학습 사이드바 컴포넌트
 */

import './PersonalStudySidebar.scss';

const PersonalStudySidebar = ({ onClose, isOpen }) => {
  // TODO: 개인 학습 기능 구현 필요

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div className="sidebar-overlay" onClick={onClose}></div>

      {/* 사이드바 */}
      <div className={`personal-study-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-message">
          <p className="message-text">개인 학습 기능은 추후 구현 예정입니다.</p>
          <p className="message-subtext">
            단어 학습, 퀴즈 풀이 등 다양한 학습 기능이 제공될 예정입니다.
          </p>
        </div>
      </div>
    </>
  );
};

export default PersonalStudySidebar;
