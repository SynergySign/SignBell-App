/**
 * @개요 퀴즈 진행 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @반환값 {JSX.Element} 퀴즈 진행 페이지 컴포넌트
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AlertModal from '../../components/ui/AlertModal';
import GameResultModal from '../../components/quiz/GameResultModal';
import styles from './QuizGamePage.module.scss';

const QuizGamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions] = useState(8);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [timer, setTimer] = useState(10);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [challengersCount, setChallengersCount] = useState(0);
  const [maxChallengers] = useState(4);
  const [hasChallenged, setHasChallenged] = useState(false);
  const [challengeOrder, setChallengeOrder] = useState(null);
  const [gamePhase, setGamePhase] = useState('challenge'); // 'challenge', 'solving', 'result'
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // 임시 순위 데이터 (실제로는 WebSocket에서 받음)
  const [rankings, setRankings] = useState([
    { rank: 1, userId: 123, nickname: '사용자1', score: 350 },
    { rank: 2, userId: 456, nickname: '사용자2', score: 200 },
    { rank: 3, userId: 789, nickname: '사용자3', score: 150 },
    { rank: 4, userId: 101, nickname: '사용자4', score: 80 },
  ]);

  // TODO: WebRTC 연동 필요
  // TODO: WebSocket 연동 필요
  // TODO: 미디어파이프 연동 필요

  // 임시 문제 데이터
  const questionData = {
    word: '안녕하세요',
  };

  // 10초 타이머
  useEffect(() => {
    if (isTimerActive && timer > 0 && gamePhase === 'challenge') {
      const countdown = setTimeout(() => {
        setTimer(timer - 1);
      }, 1000);

      return () => clearTimeout(countdown);
    } else if (timer === 0 && gamePhase === 'challenge') {
      handleTimerEnd();
    }
  }, [timer, isTimerActive, gamePhase]);

  const handleTimerEnd = () => {
    setIsTimerActive(false);
    
    if (challengersCount === 0) {
      // 도전자 없음 - 다음 문제로
      showAlert(
        '도전자 없음',
        '도전 신청 시간이 종료되었습니다. 다음 문제로 이동합니다.',
        'info'
      );
      
      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    } else {
      // 도전자 있음 - 문제 풀이 시작
      showAlert(
        '도전 마감',
        '도전 신청이 마감되었습니다. 도전자 차례입니다.',
        'info'
      );
      
      setTimeout(() => {
        setGamePhase('solving');
      }, 2000);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
      setTimer(10);
      setIsTimerActive(true);
      setChallengersCount(0);
      setHasChallenged(false);
      setChallengeOrder(null);
      setGamePhase('challenge');
      // TODO: WebSocket으로 다음 문제 요청
    } else {
      // 게임 종료 - 결과 모달 표시
      setTimeout(() => {
        setShowResultModal(true);
      }, 1000);
      // TODO: WebSocket으로 게임 종료 알림
    }
  };

  const handleReturnToRoom = () => {
    // TODO: WebSocket으로 대기실 복귀 전송
    navigate(`/quiz/waiting/${roomId}`);
  };

  const showAlert = (title, message, type = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const closeAlert = () => {
    setAlertModal({
      ...alertModal,
      isOpen: false
    });
  };

  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    // TODO: 방 나가기 WebSocket 전송
    navigate('/main');
  };

  const handleChallenge = () => {
    if (hasChallenged) {
      showAlert(
        '이미 신청함',
        '이미 도전 신청을 하셨습니다.',
        'warning'
      );
      return;
    }

    if (challengersCount >= maxChallengers) {
      showAlert(
        '신청 마감',
        '도전자가 모두 찼습니다.',
        'warning'
      );
      return;
    }

    if (timer === 0) {
      showAlert(
        '시간 종료',
        '도전 신청 시간이 종료되었습니다.',
        'warning'
      );
      return;
    }

    // 도전 신청 성공
    const order = challengersCount + 1;
    setChallengersCount(order);
    setHasChallenged(true);
    setChallengeOrder(order);

    showAlert(
      '도전 신청 완료',
      `${order}번째 도전자로 신청되었습니다!`,
      'success'
    );

    // TODO: WebSocket으로 도전 신청 전송
    // stompClient.send(`/app/room/${roomId}/quiz/challenge`, {}, JSON.stringify({
    //   questionNumber: currentQuestion
    // }));
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

        {gamePhase === 'challenge' && (
          <>
            {/* 타이머 표시 */}
            <div className={`${styles.timerDisplay} ${timer <= 3 ? styles.urgent : ''}`}>
              <span className={styles.timerLabel}>남은 시간</span>
              <span className={styles.timerValue}>{timer}초</span>
            </div>

            {/* 도전자 모집 정보 */}
            <div className={styles.challengeInfo}>
              <div className={styles.challengeTooltip}>
                선착순으로 도전자를 받는중입니다.
              </div>
              <span className={styles.challengeCount}>
                {challengersCount}/{maxChallengers}
              </span>
            </div>

            {/* 문제 도전하기 버튼 */}
            <button 
              className={`${styles.challengeButton} ${
                hasChallenged || challengersCount >= maxChallengers || timer === 0
                  ? styles.disabled 
                  : styles.active
              }`}
              onClick={handleChallenge}
              disabled={hasChallenged || challengersCount >= maxChallengers || timer === 0}
            >
              {hasChallenged 
                ? `도전 신청 완료 (${challengeOrder}번째)` 
                : '문제 도전하기'}
            </button>
          </>
        )}

        {gamePhase === 'solving' && (
          <div className={styles.solvingPhase}>
            <div className={styles.solvingMessage}>
              <h2>도전자가 문제를 풀고 있습니다...</h2>
              <p>잠시만 기다려주세요</p>
            </div>
          </div>
        )}

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

      {/* 알림 모달 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* 게임 결과 모달 */}
      <GameResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        onReturnToRoom={handleReturnToRoom}
        rankings={rankings}
      />
    </div>
  );
};

export default QuizGamePage;
