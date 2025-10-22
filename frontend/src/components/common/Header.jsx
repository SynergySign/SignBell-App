/**
 * @개요 공통 헤더 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-20
 * @반환값 {JSX.Element} 헤더 컴포넌트
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import styles from './Header.module.scss';
import {useAuthStore} from "../../store/auth/authStore.js";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  const handleLogoClick = () => {
    // 메인 페이지에서는 새로고침, 다른 페이지에서는 메인으로 이동
    if (location.pathname === '/main') {
      window.location.reload();
    } else {
      navigate('/');
    }
  };

  const handleMyPageClick = () => {
    // TODO: 마이페이지 구현 후 연결
    console.log('마이페이지로 이동');
  };

  /*const handleLogoutClick = () => {
    // TODO: 로그아웃 API 연동 필요
    console.log('로그아웃');
    navigate('/');
  };*/

  const handleLogoutClick = async () => {
    console.log('로그아웃 시도');
    // zustand store의 logout 액션 호출 (서버 로그아웃 + 클라이언트 상태 초기화)
    await logout();
    // 로그아웃 후 랜딩 페이지로 이동 (Header가 메인 페이지 외에도 표시된다고 가정하고 '/'로 이동)
    navigate('/');
  };

  // 메인 페이지에서만 마이페이지와 로그아웃 버튼 표시
  const showMainPageButtons = location.pathname === '/main';

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <div className={styles.logo} onClick={handleLogoClick}>
          SignBell
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
        </div>
      </div>
    </header>
  );
};

export default Header;
