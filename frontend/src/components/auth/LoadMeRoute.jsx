import {useEffect} from 'react';
import {useAuthStore} from "../../store/auth/authStore.js";
import {useLocation, useNavigate} from "react-router-dom";

// 앱 최초 진입 또는 새로고침 시 사용자 인증 상태를 확인하고 불러오는 컴포넌트
const LoadMeRoute = ({ children }) => {
  const { hasCheckedAuth, fetchMe, user, isAuthenticated, loading } = useAuthStore();
  const navigate = useNavigate(); // 리디렉션을 위한 훅
  const location = useLocation(); // 현재 경로를 알기 위한 훅

  console.log('LoadMeRoute render:', { hasCheckedAuth, user, isAuthenticated, loading, pathname: location.pathname });

  // 최초 진입 시 인증 체크 1회
  useEffect(() => {
    console.log('LoadMeRoute useEffect - hasCheckedAuth:', hasCheckedAuth);
    if (!hasCheckedAuth) {
      console.log('Calling fetchMe...');
      // 서버에서 실제 인증 상태를 확인
      fetchMe();
    }
  }, [hasCheckedAuth, fetchMe]);

  // 약관 동의 상태를 검사
  useEffect(() => {
    console.log('LoadMeRoute agreement check:', { hasCheckedAuth, user, isAuthenticated, requiredAgree: user?.requiredAgree, pathname: location.pathname });
    // 1. 인증 상태를 확인했고
    // 2. 사용자 정보가 있으며 (로그인 상태)
    // 3. 사용자가 인증되었으며
    // 4. 필수 약관에 동의하지 않았고
    // 5. 현재 페이지가 약관 동의 페이지가 아닐 때 약관 동의 페이지로 이동
    if (hasCheckedAuth && user && isAuthenticated && !user.requiredAgree && location.pathname !== '/terms') {
      console.log('Redirecting to terms page');
      navigate('/terms');
    }
  }, [hasCheckedAuth, user, isAuthenticated, location.pathname, navigate]);

  return children;
};

export default LoadMeRoute;