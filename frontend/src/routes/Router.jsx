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

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
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
        <Route path="/quiz/waiting/:roomId" element={<QuizWaitingRoom />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
