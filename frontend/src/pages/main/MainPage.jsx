/**
 * @개요 메인 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 메인 페이지 컴포넌트
 */

import { useState } from 'react';
import { faBook, faGamepad } from '@fortawesome/free-solid-svg-icons';
import UserProfileCard from '../../components/main/UserProfileCard';
import FeatureButton from '../../components/main/FeatureButton';
import PersonalStudySidebar from '../../components/main/PersonalStudySidebar';
import RealTimeQuizSidebar from '../../components/quiz/RealTimeQuizSidebar';
import styles from './MainPage.module.scss';
import { useNavigate } from 'react-router-dom';


const MainPage = () => {
  const [activeSidebar, setActiveSidebar] = useState(null);
  // =============개인 학습페이지용 임시 코드==================
  const navigate = useNavigate();
  // 개인 학습 임시 라우트 함수

  const handlePersonalStudyRoute = () => {
    // navigate 함수에 이동할 경로(path)를 문자열로 전달합니다.
    navigate('/personal-study');
    console.log('개인 학습 페이지로 이동');
  }
// =============개인 학습페이지용 임시 코드==================




  const handlePersonalStudyClick = () => {
    setActiveSidebar(activeSidebar === 'personal' ? null : 'personal');
    console.log('개인 학습 클릭');
  };

  const handleRealTimeQuizClick = () => {
    setActiveSidebar(activeSidebar === 'quiz' ? null : 'quiz');
    console.log('실시간 퀴즈 클릭');
  };





  return (
    <div className={styles.mainPage}>
      <div className={styles.mainContent}>
        <div className={styles.leftSection}>
          <FeatureButton
            title="개인 학습"
            icon={faBook}
            // 임시 라우트함수 추가
            onClick={handlePersonalStudyRoute}
            delay={0.3}
            active={activeSidebar === 'personal'}
          />
          <FeatureButton
            title="실시간 퀴즈"
            icon={faGamepad}
            onClick={handleRealTimeQuizClick}
            delay={0.4}
            active={activeSidebar === 'quiz'}
          />
        </div>

        <div className={styles.centerSection}>
          <UserProfileCard />
        </div>
      </div>

      {/* 개인 학습 사이드바 */}
      {activeSidebar === 'personal' && (
        <PersonalStudySidebar
          isOpen={activeSidebar === 'personal'}
          onClose={() => setActiveSidebar(null)}
        />
      )}

      {/* 실시간 퀴즈 사이드바 */}
      {activeSidebar === 'quiz' && (
        <RealTimeQuizSidebar
          isOpen={activeSidebar === 'quiz'}
          onClose={() => setActiveSidebar(null)}
        />
      )}
    </div>
  );
};

export default MainPage;
