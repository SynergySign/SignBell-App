/**
 * @개요 퀴즈 진행 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @반환값 {JSX.Element} 퀴즈 진행 페이지 컴포넌트
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './QuizGamePage.module.scss';

const QuizGamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions] = useState(10);
  const [showExitModal, setShowExitModal] = useState(false);

  // TODO: WebRTC 연동 필요
  // TODO: WebSocket 연동 필요
  // TODO: 미디어파이프 연동 필요

  // 임시 문제 데이터
  const questionData = {
    word: '안녕하세요',
    challengersCount: 2,
    maxChallengers: 4,
  };

  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    // TODO: 방 나가기 API 연동 필요
    navigate('/main');
  };

  const handleChallenge = () => {
    // TODO: 도전 신청 WebSocket 전송
    console.log('문제 도전하기');
  };

  return (
    <div className={styles.quizGamePage}>
      {/* 방 정보 섹션 */}
      <div className={styles.roomInfoSection}>
        <div className={styles.roomInfo}>
          <span className={styles.roomNumber}>방 번호: #{roomId}</span>
          <h2 className={styles.roomTitle}>방 제목</h2>
        </div>
        <button className={styles.exitButton} onClick={handleExit}>
          나가기
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <main className={styles.gameContent}>
        {/* 문제 제시 섹션 */}
        <div className={styles.questionSection}>
          <span className={styles.questionNumber}>
            (문제 {currentQuestion}/{totalQuestions})
          </span>
          <h1 className={styles.questionText}>
            '{questionData.word}'를 수어로 표현하세요.
          </h1>
        </div>

        {/* 도전자 모집 정보 */}
        <div className={styles.challengeInfo}>
          <div className={styles.challengeTooltip}>
            선착순으로 도전자를 받는중입니다.
          </div>
          <span className={styles.challengeCount}>
            {questionData.challengersCount}/{questionData.maxChallengers}
          </span>
        </div>

        {/* 문제 도전하기 버튼 */}
        <button 
          className={`${styles.challengeButton} ${
            questionData.challengersCount >= questionData.maxChallengers 
              ? styles.disabled 
              : styles.active
          }`}
          onClick={handleChallenge}
          disabled={questionData.challengersCount >= questionData.maxChallengers}
        >
          문제 도전하기
        </button>

        {/* 플레이어 카드 영역 */}
        <div className={styles.playersGrid}>
          <div className={styles.playerCard}>
            <div className={styles.webcamPlaceholder}>
              <span>웹캠 영상</span>
            </div>
            <div className={styles.playerInfo}>
              <span className={styles.playerName}>사용자1 (나)</span>
              <span className={styles.playerScore}>1250</span>
            </div>
          </div>

          <div className={styles.playerCard}>
            <div className={styles.webcamPlaceholder}>
              <span>웹캠 영상</span>
            </div>
            <div className={styles.playerInfo}>
              <span className={styles.playerName}>사용자2</span>
              <span className={styles.playerScore}>980</span>
            </div>
          </div>

          <div className={styles.playerCard}>
            <div className={styles.webcamPlaceholder}>
              <span>웹캠 영상</span>
            </div>
            <div className={styles.playerInfo}>
              <span className={styles.playerName}>사용자3</span>
              <span className={styles.playerScore}>1100</span>
            </div>
          </div>

          <div className={styles.playerCard}>
            <div className={styles.webcamPlaceholder}>
              <span>웹캠 영상</span>
            </div>
            <div className={styles.playerInfo}>
              <span className={styles.playerName}>사용자4</span>
              <span className={styles.playerScore}>850</span>
            </div>
          </div>
        </div>
      </main>

      {/* 나가기 확인 모달 */}
      {showExitModal && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowExitModal(false)}></div>
          <div className={styles.exitConfirmModal}>
            <h3>알림</h3>
            <p>정말로 나가시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={() => setShowExitModal(false)}>
                취소
              </button>
              <button className={styles.confirmButton} onClick={confirmExit}>
                나가기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizGamePage;
