/**
 * @개요 랜딩 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 랜딩 페이지 컴포넌트
 */

import {useNavigate} from 'react-router-dom';
import SocialLoginButton from '../../components/auth/SocialLoginButton';
import styles from './LandingPage.module.scss';
import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/auth/authStore.js';
import logo from '../../assets/img/1.png';

const LandingPage = () => {

  const {isAuthenticated} = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef(null);
  // 백엔드 카카오 엔드포인트 (환경 변수 사용)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const KAKAO_AUTH_URL = `${API_BASE_URL}/oauth2/authorization/kakao`;
  const navigate = useNavigate();

  // 이미 로그인 상태면 홈으로 이동
  useEffect(() => {
    console.log('isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      navigate('/main', {replace: true}); // Router.jsx에 '/main'이 있으므로 이동
    }
  }, [isAuthenticated, navigate]);

  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleKakaoLogin = () => {
    console.log('카카오 로그인 클릭');
    
    // 팝업으로 OAuth2 로그인 시작
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      KAKAO_AUTH_URL,
      'KakaoLogin',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );
    
    if (!popup) {
      alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      return;
    }
    
    // 팝업이 닫혔는지 주기적으로 확인
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        console.log('팝업이 닫혔습니다. 사용자 정보를 다시 확인합니다.');
        // 팝업이 닫히면 현재 페이지의 인증 상태를 다시 확인
        // authStore의 fetchMe는 이미 PrivateRoute나 다른 곳에서 호출될 것
      }
    }, 500);
  };

  return (
    <div className={styles.landingPage}>
      <div className={styles.landingContent}>
        <div className={styles.serviceIntro}>
          <div className={styles.logoSection}>
            <img src={logo} alt="SignBell Logo" className={styles.mainLogo} />
          </div>

          <div className={styles.featureCards}>
            <div className={styles.featureCard}>
              <h3 className={styles.cardTitle}>개인 수어 학습</h3>
              <p className={styles.cardDescription}>
                카테고리별로 단어를 체계적으로<br />학습하세요
              </p>
            </div>

            <div className={styles.featureCard}>
              <h3 className={styles.cardTitle}>실시간 퀴즈</h3>
              <p className={styles.cardDescription}>
                친구들과 함께 실시간으로 수어 퀴즈에<br />도전해보세요
              </p>
            </div>
          </div>
        </div>

        <div className={styles.loginBox}>
          <h2 className={styles.loginTitle}>로그인</h2>
          <p className={styles.loginSubtitle}>소셜 계정으로 로그인</p>

          <div className={styles.loginButtons}>
            {error && (
              <p>에러가 발생했습니다.</p>
            )}


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
