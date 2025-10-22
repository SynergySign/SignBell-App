/**
 * @개요 애플리케이션 라우팅 설정
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 라우터 컴포넌트
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import LandingPage from '../pages/auth/LandingPage';
import TermsPage from '../pages/auth/TermsPage';
import MainPage from '../pages/main/MainPage';
import GameRoom from '../pages/GameRoom';
import QuizWaitingRoom from '../pages/quiz/QuizWaitingRoom';
import QuizGamePage from '../pages/quiz/QuizGamePage';
import PopupClosePage from '../pages/auth/PopupClosePage';

// ===== 임시 개인 수어학습 페이지 컴포넌트 임포트
import SignEduPage from '../pages/signEdu/SignEduPage';
import SignDetailPage from '../pages/signEdu/SignDetailPage';
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
      <Routes>
        {/* MainLayout을 사용하는 라우트들 */}
        <Route path="/" element={
          <MainLayout>
            <LandingPage />
          </MainLayout>
        } />
        <Route path="/terms" element={
          <MainLayout>
            <TermsPage />
          </MainLayout>
        } />
        <Route path="/main" element={
          <MainLayout>
            <MainPage />
          </MainLayout>
        } />
        <Route path="/gameroom" element={
          <MainLayout>
            <GameRoom />
          </MainLayout>
        } />

        {/* 👇️ 2. [개인 학습] 카테고리/목록 페이지 라우트 추가 */}
        <Route path="/personal-study" element={
          <MainLayout>
            <SignEduPage />
          </MainLayout>
        } />

        {/* 👇️ 3. [개인 학습] 상세 페이지 라우트 추가 (URL 파라미터 사용) */}
        <Route path="/personal-study/:signId" element={
          <MainLayout>
            <SignDetailPage />
          </MainLayout>
        } />

        {/* 레거시 링크 호환: /signedu/:signId -> /personal-study/:signId 로 리다이렉트 */}
        <Route path="/signedu/:signId" element={<SigneduRedirect />} />

        {/* MainLayout을 사용하지 않는 독립적인 라우트들 */}
        <Route path="/quiz/waiting/:roomId" element={<QuizWaitingRoom />} />
        <Route path="/quiz/game/:roomId" element={<QuizGamePage />} />

        {/* 팝업 닫기 페이지 라우트 (다른 컴포넌트에 영향을 주지 않음) */}
        <Route path="/popup-close" element={<PopupClosePage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
