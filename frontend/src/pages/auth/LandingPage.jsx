/**
 * @개요 랜딩 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 랜딩 페이지 컴포넌트
 */

import { useNavigate } from 'react-router-dom';
import SocialLoginButton from '../../components/auth/SocialLoginButton';
import './LandingPage.scss';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleKakaoLogin = () => {
    // TODO: API 연동이 필요합니다.
    console.log('카카오 로그인 클릭');
    
    // 약관 동의 페이지로 이동
    navigate('/terms');
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="service-intro">
          <h1 className="service-title">SignBell</h1>
          <p className="service-description">
            수어로 소통하는 새로운 방법
          </p>
        </div>

        <div className="login-box">
          <h2 className="login-title">로그인</h2>
          <p className="login-subtitle">소셜 계정으로 로그인</p>
          
          <div className="login-buttons">
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
