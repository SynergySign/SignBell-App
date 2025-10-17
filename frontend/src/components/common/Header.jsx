/**
 * @개요 공통 헤더 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 헤더 컴포넌트
 */

import { useNavigate } from 'react-router-dom';
import './Header.scss';

const Header = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo" onClick={handleLogoClick}>
          SignBell
        </div>
        <div className="header-actions">
          {/* TODO: 로그인 상태에 따라 버튼 표시 변경 */}
        </div>
      </div>
    </header>
  );
};

export default Header;
