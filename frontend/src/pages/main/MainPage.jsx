/**
 * @개요 메인 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 메인 페이지 컴포넌트
 */

import UserProfileCard from '../../components/main/UserProfileCard';
import './MainPage.scss';

const MainPage = () => {
  return (
    <div className="main-page">
      <div className="main-content">
        <UserProfileCard />
        {/* TODO: 기능 버튼 구현 예정 */}
      </div>
    </div>
  );
};

export default MainPage;
