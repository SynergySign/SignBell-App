/**
 * @개요 실시간 퀴즈 사이드바 컴포넌트 (임시 구현)
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @반환값 {JSX.Element} 실시간 퀴즈 사이드바 컴포넌트
 */

import './RealTimeQuizSidebar.scss';

const RealTimeQuizSidebar = () => {
  // TODO: 실시간 퀴즈 기능 구현 필요

  return (
    <div className="real-time-quiz-sidebar">
      <div className="sidebar-message">
        <p className="message-text">실시간 퀴즈 기능은 추후 구현 예정입니다.</p>
        <p className="message-subtext">
          다른 사용자들과 함께 실시간으로 퀴즈를 풀고 경쟁할 수 있는 기능이
          제공될 예정입니다.
        </p>
      </div>
    </div>
  );
};

export default RealTimeQuizSidebar;
