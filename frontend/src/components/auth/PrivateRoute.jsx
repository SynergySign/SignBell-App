import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * 로그인이 필요한 페이지를 위한 라우트 가드 컴포넌트입니다.
 *
 * - Zustand store의 'isAuthenticated' 상태를 확인합니다.
 * - 인증된 사용자: 요청한 페이지(children)를 그대로 렌더링합니다.
 * - 인증되지 않은 사용자: 로그인 페이지('/login')로 리다이렉트 시킵니다.
 * - 'replace' 옵션으로 히스토리에 현재 경로를 남기지 않습니다.
 * - 'state' 옵션으로 로그인 후 돌아올 경로를 전달하여 UX를 개선합니다.
 */
const PrivateRoute = ({ children }) => {
    const { isAuthenticated } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        // 사용자가 인증되지 않았으면 로그인 페이지로 리다이렉트
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 사용자가 인증되었으면 자식 컴포넌트(요청한 페이지)를 렌더링
    return children;
};

export default PrivateRoute;