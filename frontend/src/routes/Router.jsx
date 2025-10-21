/**
 * @개요 애플리케이션 라우팅 설정
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 라우터 컴포넌트
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import LandingPage from '../pages/auth/LandingPage';
import TermsPage from '../pages/auth/TermsPage';
import MainPage from '../pages/main/MainPage';
import GameRoom from '../pages/GameRoom';
import QuizWaitingRoom from '../pages/quiz/QuizWaitingRoom';
import QuizGamePage from '../pages/quiz/QuizGamePage';
import PopupClosePage from '../pages/auth/PopupClosePage';

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
