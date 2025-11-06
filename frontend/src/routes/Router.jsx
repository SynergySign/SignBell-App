/**
 * @개요 애플리케이션 라우팅 설정
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-23
 * @반환값 {JSX.Element} 라우터 컴포넌트
 */

import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import LoadMeRoute from "../components/auth/LoadMeRoute.jsx";

import LandingPage from '../pages/auth/LandingPage';
import TermsPage from '../pages/auth/TermsPage';
import PopupClosePage from '../pages/auth/PopupClosePage';

// 3. 무거운 페이지들은 모두 lazy로 변경합니다.
const MainPage = lazy(() => import('../pages/main/MainPage'));
const MyPage = lazy(() => import('../pages/mypage/MyPage'));
const GameRoom = lazy(() => import('../pages/GameRoom'));
const QuizWaitingRoom = lazy(() => import('../pages/quiz/QuizWaitingRoom'));
const QuizGamePage = lazy(() => import('../pages/quiz/QuizGamePage'));
const StudyDataPage = lazy(() => import('../pages/study/StudyDataPage'));

// =============================================

// 레거시 경로(`/signedu/:signId`)를 새 경로(`/personal-study/:signId`)로 리다이렉트하는 컴포넌트
const SigneduRedirect = () => {
  const { signId } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (signId) {
      navigate(`/personal-study/${signId}`, { replace: true });
    }
  }, [signId, navigate]);
  return null;
};

const Router = () => {
    return (
        <BrowserRouter>
            <LoadMeRoute>
                {/* 4. <Routes>를 <Suspense>로 감싸고 fallback을 지정합니다. */}
                <Suspense fallback={<div style={{ padding: '20px' }}>페이지 로딩 중...</div>}>
                    <Routes>
                        {/* MainLayout을 사용하는 라우트들 */}
                        <Route path="/" element={<MainLayout><LandingPage /></MainLayout>} />
                        <Route path="/terms" element={<MainLayout><TermsPage /></MainLayout>} />

                        {/* Lazy 로드되는 페이지들 */}
                        <Route path="/main" element={<MainLayout><MainPage /></MainLayout>} />
                        <Route path="/mypage" element={<MainLayout><MyPage /></MainLayout>} />
                        <Route path="/gameroom" element={<MainLayout><GameRoom /></MainLayout>} />

                        {/* 수어 연습 영상 데이터 제공 페이지 */}
                        <Route path="/study/data/:wordId" element={<MainLayout><StudyDataPage /></MainLayout>} />

                        {/* MainLayout을 사용하지 않는 독립적인 라우트들 */}
                        <Route path="/quiz/waiting/:roomId" element={<QuizWaitingRoom />} />
                        <Route path="/quiz/game/:roomId" element={<QuizGamePage />} />

                        {/* 팝업 닫기 페이지 라우트 */}
                        <Route path="/popup-close" element={<PopupClosePage />} />
                    </Routes>
                </Suspense>
            </LoadMeRoute>
        </BrowserRouter>
    );
};

export default Router;
