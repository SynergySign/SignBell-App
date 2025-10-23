/**
 * @개요 공통 헤더 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-20
 * @반환값 {JSX.Element} 헤더 컴포넌트
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRightFromBracket, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import styles from './Header.module.scss';
import logo from '../../assets/img/1.png';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoClick = () => {
    // 메인 페이지에서는 새로고침, 다른 페이지에서는 메인으로 이동
    if (location.pathname === '/main') {
      window.location.reload();
    } else if (location.pathname === '/mypage') {
      navigate('/main');
    } else {
      navigate('/');
    }
  };

  const handleMyPageClick = () => {
    navigate('/mypage');
  };

  const handleBackClick = () => {
    navigate('/main');
  };

  const handleLogoutClick = () => {
    // TODO: 로그아웃 API 연동 필요
    console.log('로그아웃');
    navigate('/');
  };

  // 메인 페이지에서만 마이페이지와 로그아웃 버튼 표시
  const showMainPageButtons = location.pathname === '/main';
  // 마이페이지에서는 뒤로가기 버튼 표시
  const showBackButton = location.pathname === '/mypage';

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <div className={styles.logo} onClick={handleLogoClick}>
          <img src={logo} alt="SignBell Logo" className={styles.logoImage} />
        </div>
        <div className={styles.headerActions}>
          {showMainPageButtons && (
            <>
              <button
                className={`${styles.headerButton} ${styles.mypageButton}`}
                onClick={handleMyPageClick}
                aria-label="마이페이지"
              >
                <FontAwesomeIcon icon={faUser} />
                <span>마이페이지</span>
              </button>
              <button
                className={`${styles.headerButton} ${styles.logoutButton}`}
                onClick={handleLogoutClick}
                aria-label="로그아웃"
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                <span>로그아웃</span>
              </button>
            </>
          )}
          {showBackButton && (
            <button
              className={`${styles.headerButton} ${styles.backButton}`}
              onClick={handleBackClick}
              aria-label="뒤로가기"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>뒤로가기</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
