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
import React, {useEffect, useRef, useState} from 'react';
import {useAuthStore} from '../../store/auth/authStore.js';

const LandingPage = () => {

  const {isAuthenticated} = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef(null);
  // 추가: 백엔드 카카오 엔드포인트와 인증 상태
  const KAKAO_AUTH_URL = 'https://localhost:8443/oauth2/authorization/kakao';
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
    // TODO: API 연동이 필요합니다.
    console.log('카카오 로그인 클릭');

    setIsLoading(true);
    setError('');

    // 팝업창 열기
    // 주의: 백엔드 리디렉션 URI가 'http://localhost:5173/popup-close'와 일치해야 합니다.
    const popup = window.open(KAKAO_AUTH_URL, 'KakaoLoginPopup', 'width=460,height=600,left=100,top=100');
    // 팝업이 열리지 않았을 경우
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setIsLoading(false);
      setError('팝업 차단을 해제하고 다시 시도해 주세요.');
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 팝업 창이 강제로 닫혔는지 확인하는 로직
    intervalRef.current = setInterval(() => {
      if (popup.closed) {
        setIsLoading(false);
        setError('로그인 창이 닫혔습니다. 다시 시도해 주세요.');
        clearInterval(intervalRef.current);
      }
    }, 500);

    // 약관 동의 페이지로 이동
    // navigate('/terms');
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
