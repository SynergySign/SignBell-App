/**
 * @개요 랜딩 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 랜딩 페이지 컴포넌트
 */

import { useNavigate } from 'react-router-dom';
import SocialLoginButton from '../../components/auth/SocialLoginButton';
import styles from './LandingPage.module.scss';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleKakaoLogin = () => {
    // TODO: API 연동이 필요합니다.
    console.log('카카오 로그인 클릭');
    
    // 약관 동의 페이지로 이동
    navigate('/terms');
  };

  return (
    <div className={styles.landingPage}>
      <div className={styles.landingContent}>
        <div className={styles.serviceIntro}>
          <h1 className={styles.serviceTitle}>SignBell</h1>
          <p className={styles.serviceDescription}>
            수어로 소통하는 새로운 방법
          </p>
        </div>

        <div className={styles.loginBox}>
          <h2 className={styles.loginTitle}>로그인</h2>
          <p className={styles.loginSubtitle}>소셜 계정으로 로그인</p>
          
          <div className={styles.loginButtons}>
            <SocialLoginButton 
              provider="kakao" 
              onClick={handleKakaoLogin}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
