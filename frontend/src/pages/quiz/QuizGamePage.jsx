/**
 * @개요 퀴즈 진행 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @반환값 {JSX.Element} 퀴즈 진행 페이지 컴포넌트
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Toast from '../../components/ui/Toast';
import GameResultModal from '../../components/quiz/GameResultModal';
import useWebcam from '../../hooks/useWebcam';
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
  const [gamePhase, setGamePhase] = useState('challenge'); // 'challenge', 'solving', 'result', 'myTurn'
  const [toast, setToast] = useState({
    isOpen: false,
    message: '',
    type: 'info'
  });
  const [solvingTimer, setSolvingTimer] = useState(5); // 5초 카운트다운 (준비 시간)
  const [signingTimer, setSigningTimer] = useState(10); // 10초 수어 표현 시간
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [currentChallenger, setCurrentChallenger] = useState(1); // 현재 도전자 순서
  const [totalChallengers, setTotalChallengers] = useState(2); // 총 도전자 수
  const [isWaitingResult, setIsWaitingResult] = useState(false); // 수어 인식 결과 대기 중
  const [resultMessage, setResultMessage] = useState(''); // 결과 메시지

  // 임시 플레이어 데이터 (실제로는 WebSocket에서 받음)
  const [players] = useState([
    { id: 1, nickname: '사용자1', score: 1250, isMe: true, isCurrentPlayer: false },
    { id: 2, nickname: '사용자2', score: 980, isMe: false, isCurrentPlayer: false },
    { id: 3, nickname: '사용자3', score: 1100, isMe: false, isCurrentPlayer: false },
    { id: 4, nickname: '사용자4', score: 850, isMe: false, isCurrentPlayer: false },
  ]);

  // 임시 순위 데이터 (실제로는 WebSocket에서 받음)
  const [rankings] = useState([
    { rank: 1, userId: 123, nickname: '사용자1', score: 350 },
    { rank: 2, userId: 456, nickname: '사용자2', score: 200 },
    { rank: 3, userId: 789, nickname: '사용자3', score: 150 },
    { rank: 4, userId: 101, nickname: '사용자4', score: 80 },
  ]);

  // ============================================
  // 웹캠 관리
  // ============================================
  const {
    stream,
    isWebcamOn,
    error: webcamError,
    videoRef,
    startWebcam,
    stopWebcam,
    toggleWebcam
  } = useWebcam();

  // 게임 시작 시 웹캠 자동 시작
  useEffect(() => {
    startWebcam();
    
    return () => {
      stopWebcam();
    };
  }, []);

  // ============================================
  // TODO: WebSocket 연동 영역
  // ============================================
  // useEffect(() => {
  //   // WebSocket 연결
  //   const socket = new SockJS('/ws');
  //   const stompClient = Stomp.over(socket);
  //   
  //   stompClient.connect({}, () => {
  //     // 퀴즈 시작 구독
  //     stompClient.subscribe(`/topic/room/${roomId}/quiz/start`, (message) => {
  //       const data = JSON.parse(message.body);
  //       // 퀴즈 시작 처리
  //     });
  //     
  //     // 도전 신청 구독
  //     stompClient.subscribe(`/topic/room/${roomId}/quiz/challenge`, (message) => {
  //       const data = JSON.parse(message.body);
  //       setChallengersCount(data.challengersCount);
  //     });
  //     
  //     // 문제 풀이 시작 구독
  //     stompClient.subscribe(`/topic/room/${roomId}/quiz/solving`, (message) => {
  //       const data = JSON.parse(message.body);
  //       setGamePhase('solving');
  //       setCurrentChallenger(data.challengerOrder);
  //     });
  //     
  //     // 정답/오답 결과 구독
  //     stompClient.subscribe(`/topic/room/${roomId}/quiz/result`, (message) => {
  //       const data = JSON.parse(message.body);
  //       if (data.isCorrect) {
  //         showToast('정답! 다음 문제로 이동합니다.', 'success');
  //       } else {
  //         showToast('오답! 다음 도전자에게 기회가 넘어갑니다.', 'error');
  //       }
  //     });
  //   });
  //   
  //   return () => {
  //     if (stompClient) stompClient.disconnect();
  //   };
  // }, [roomId]);

  // ============================================
  // TODO: WebRTC 연동 영역
  // ============================================
  // useEffect(() => {
  //   // WebRTC 연결 설정
  //   // 각 참가자의 비디오 스트림 연결
  // }, []);

  // ============================================
  // TODO: MediaPipe 수어 인식 영역
  // ============================================
  // useEffect(() => {
  //   if (gamePhase === 'myTurn' && solvingTimer === 0) {
  //     // MediaPipe 수어 인식 시작
  //     // FastAPI 서버로 프레임 전송
  //   }
  // }, [gamePhase, solvingTimer]);

  // ============================================
  // 임시 데이터 (실제로는 WebSocket에서 받음)
  // ============================================
  const questionData = {
    word: '안녕하세요',
  };

  // ============================================
  // 타이머 관리 useEffect
  // ============================================
  
  // 10초 타이머 (도전 신청)
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

  // 5초 카운트다운 (내 차례 준비)
  useEffect(() => {
    if (gamePhase === 'myTurn' && solvingTimer > 0 && signingTimer === 10) {
      const countdown = setTimeout(() => {
        setSolvingTimer(solvingTimer - 1);
      }, 1000);

      return () => clearTimeout(countdown);
    } else if (gamePhase === 'myTurn' && solvingTimer === 0 && signingTimer === 10) {
      // 카운트다운 완료 - 수어 동작 시작
      handleStartSigning();
    }
  }, [solvingTimer, gamePhase, signingTimer]);

  // 10초 수어 표현 타이머
  useEffect(() => {
    if (gamePhase === 'myTurn' && solvingTimer === 0 && signingTimer > 0 && signingTimer < 10) {
      const countdown = setTimeout(() => {
        setSigningTimer(signingTimer - 1);
      }, 1000);

      return () => clearTimeout(countdown);
    } else if (gamePhase === 'myTurn' && signingTimer === 0) {
      // 수어 표현 시간 종료
      handleSigningResult();
    }
  }, [signingTimer, gamePhase, solvingTimer]);

  // 토스트 자동 닫기 (3초 후)
  useEffect(() => {
    if (toast.isOpen) {
      const autoClose = setTimeout(() => {
        closeToast();
      }, 3000);

      return () => clearTimeout(autoClose);
    }
  }, [toast.isOpen]);

  // ============================================
  // 게임 플로우 핸들러 함수들
  // ============================================
  
  /**
   * 도전 신청 타이머 종료 처리
   * - 도전자 없음: 다음 문제로 이동
   * - 도전자 있음: 문제 풀이 시작
   */
  const handleTimerEnd = () => {
    setIsTimerActive(false);
    
    if (challengersCount === 0) {
      // 도전자 없음 - 다음 문제로
      showToast('도전 신청 시간이 종료되었습니다. 다음 문제로 이동합니다.', 'info');
      
      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    } else {
      // 도전자 있음 - 문제 풀이 시작
      showToast('도전 신청이 마감되었습니다. 도전자 차례입니다.', 'info');
      
      setTimeout(() => {
        setGamePhase('solving');
      }, 2000);
    }
  };

  /**
   * 다음 문제로 이동
   * - 마지막 문제인 경우: 게임 결과 모달 표시
   * - 그 외: 다음 문제 로드 및 상태 초기화
   * TODO: WebSocket으로 다음 문제 요청
   */
  const moveToNextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
      setTimer(10);
      setIsTimerActive(true);
      setChallengersCount(0);
      setHasChallenged(false);
      setChallengeOrder(null);
      setGamePhase('challenge');
      // TODO: WebSocket 전송
      // stompClient.send(`/app/room/${roomId}/quiz/next`, {}, JSON.stringify({
      //   questionNumber: currentQuestion + 1
      // }));
    } else {
      // 게임 종료 - 결과 모달 표시
      setTimeout(() => {
        setShowResultModal(true);
      }, 1000);
      // TODO: WebSocket 전송
      // stompClient.send(`/app/room/${roomId}/quiz/end`, {}, JSON.stringify({}));
    }
  };

  /**
   * 대기실로 돌아가기
   * TODO: WebSocket으로 대기실 복귀 전송
   */
  const handleReturnToRoom = () => {
    // TODO: WebSocket 전송
    // stompClient.send(`/app/room/${roomId}/return`, {}, JSON.stringify({}));
    navigate(`/quiz/waiting/${roomId}`);
  };

  /**
   * 수어 표현 시작 (준비 카운트다운 완료 후)
   * TODO: MediaPipe 수어 인식 시작
   */
  const handleStartSigning = () => {
    // 수어 표현 타이머 시작
    setSigningTimer(9); // 10초부터 시작하므로 9로 설정
    // TODO: MediaPipe 시작
    // startMediaPipe();
  };

  /**
   * 수어 표현 결과 처리 (임시: 랜덤)
   * TODO: FastAPI 서버에서 받은 결과로 처리
   */
  const handleSigningResult = () => {
    // 수어 인식 결과 대기 상태로 전환
    setIsWaitingResult(true);
    setResultMessage('수어 인식 중...');
    
    // TODO: FastAPI 서버로 수어 데이터 전송
    // const response = await fetch('http://fastapi-server/api/verify-sign', {
    //   method: 'POST',
    //   body: JSON.stringify({ handLandmarks: ... })
    // });
    
    // 임시: 6~10초 사이 랜덤 대기 시간
    const waitTime = Math.floor(Math.random() * 4000) + 6000; // 6000~10000ms
    
    setTimeout(() => {
      // 임시로 50% 확률로 정답/오답 처리
      const isCorrect = Math.random() > 0.5;
      
      if (isCorrect) {
        setResultMessage('정답입니다! 🎉');
        
        setTimeout(() => {
          setIsWaitingResult(false);
          setResultMessage('');
          moveToNextQuestion();
        }, 2000);
      } else {
        setResultMessage('오답입니다 😢');
        
        setTimeout(() => {
          setIsWaitingResult(false);
          setResultMessage('');
          handleNextChallenger();
        }, 2000);
      }
    }, waitTime);
  };

  /**
   * 다음 도전자로 이동
   * - 남은 도전자 있음: 다음 도전자 차례
   * - 모든 도전자 실패: 다음 문제로 이동
   * TODO: WebSocket으로 다음 도전자 알림
   */
  const handleNextChallenger = () => {
    if (currentChallenger < totalChallengers) {
      setCurrentChallenger(currentChallenger + 1);
      setGamePhase('solving');
      showToast(`${currentChallenger + 1}번째 도전자 차례입니다.`, 'info');
      // TODO: WebSocket 전송
      // stompClient.send(`/app/room/${roomId}/quiz/nextChallenger`, {}, JSON.stringify({
      //   challengerOrder: currentChallenger + 1
      // }));
    } else {
      // 모든 도전자 실패 - 다음 문제로
      showToast('모든 도전자 실패! 다음 문제로 이동합니다.', 'info');
      
      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    }
  };

  /**
   * 내 차례 시작 (테스트용)
   * TODO: WebSocket에서 받은 신호로 처리
   */
  const handleMyTurn = () => {
    setIsMyTurn(true);
    setGamePhase('myTurn');
    setSolvingTimer(5);
    setSigningTimer(10);
    showToast('내 차례! 준비하세요! 5초 후 수어 동작을 시작합니다.', 'info');
  };

  // ============================================
  // UI 헬퍼 함수들
  // ============================================
  
  /**
   * 토스트 메시지 표시
   */
  const showToast = (message, type = 'info') => {
    setToast({
      isOpen: true,
      message,
      type
    });
  };

  /**
   * 토스트 메시지 닫기
   */
  const closeToast = () => {
    setToast({
      ...toast,
      isOpen: false
    });
  };

  /**
   * 방 나가기 확인 모달 표시
   */
  const handleExit = () => {
    setShowExitModal(true);
  };

  /**
   * 방 나가기 확정
   * TODO: WebSocket으로 방 나가기 전송
   */
  const confirmExit = () => {
    // TODO: WebSocket 전송
    // stompClient.send(`/app/room/${roomId}/exit`, {}, JSON.stringify({}));
    navigate('/main');
  };

  // ============================================
  // 도전 신청 핸들러
  // ============================================
  
  /**
   * 문제 도전하기 버튼 클릭
   * - 중복 신청 방지
   * - 정원 초과 방지
   * - 시간 종료 방지
   * TODO: WebSocket으로 도전 신청 전송
   */
  const handleChallenge = () => {
    if (hasChallenged) {
      showToast('이미 도전 신청을 하셨습니다.', 'warning');
      return;
    }

    if (challengersCount >= maxChallengers) {
      showToast('도전자가 모두 찼습니다.', 'warning');
      return;
    }

    if (timer === 0) {
      showToast('도전 신청 시간이 종료되었습니다.', 'warning');
      return;
    }

    // 도전 신청 성공
    const order = challengersCount + 1;
    setChallengersCount(order);
    setHasChallenged(true);
    setChallengeOrder(order);

    showToast(`도전 신청 완료! ${order}번째 도전자로 신청되었습니다!`, 'success');

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

        {/* 메인 컨텐츠 영역 (가로 배치) */}
        <div className={styles.mainContentRow}>
          {/* 메인 영상 카드 (도전자) */}
          <div className={styles.mainVideoCard}>
            <div className={styles.mainWebcam}>
              {isWebcamOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={styles.webcamVideo}
                />
              ) : (
                <div className={styles.noWebcam}>
                  <span>웹캠 {webcamError ? '오류' : '로딩중'}</span>
                  {webcamError && <p className={styles.errorText}>{webcamError}</p>}
                </div>
              )}
            </div>
            <div className={styles.mainPlayerInfo}>
              <span className={styles.mainPlayerName}>닉네임</span>
              <span className={styles.mainPlayerScore}>800점</span>
              <button 
                className={styles.webcamToggle}
                onClick={toggleWebcam}
              >
                {isWebcamOn ? '웹캠 끄기' : '웹캠 켜기'}
              </button>
            </div>
          </div>

          {/* 게임 상태별 UI */}
          <div className={styles.gameStateSection}>
            {gamePhase === 'challenge' && (
              <div className={styles.challengeSection}>
            {/* 타이머 표시 */}
            <div className={`${styles.timerDisplay} ${timer <= 3 ? styles.urgent : ''}`}>
              <span className={styles.timerLabel}>남은 시간</span>
              <span className={styles.timerValue}>{timer}초</span>
            </div>

            {/* 도전자 모집 정보 */}
            <div className={styles.challengeInfo}>
              <span className={styles.challengeTooltip}>
                선착순으로 도전자를 받는중입니다.
              </span>
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
              </div>
            )}

            {gamePhase === 'solving' && (
              <div className={styles.solvingPhase}>
                <div className={styles.solvingMessage}>
                  <h2>{currentChallenger}번째 도전자가 문제를 풀고 있습니다...</h2>
                  <p>잠시만 기다려주세요</p>
                </div>
              </div>
            )}

            {gamePhase === 'myTurn' && (
              <div className={styles.myTurnPhase}>
                <div className={styles.countdownDisplay}>
                  {isWaitingResult ? (
                    <>
                      <h2>결과 확인 중...</h2>
                      <div className={styles.loadingSpinner}></div>
                      <p className={styles.waitingText}>{resultMessage}</p>
                      <p className={styles.waitingHint}>AI가 수어를 분석하고 있습니다 (6~10초 소요)</p>
                    </>
                  ) : (
                    <>
                      <h2>내 차례입니다!</h2>
                      {solvingTimer > 0 ? (
                        <>
                          <p>수어 동작 준비하세요</p>
                          <div className={`${styles.countdownNumber} ${solvingTimer <= 2 ? styles.urgent : ''}`}>
                            {solvingTimer}
                          </div>
                          <p className={styles.prepareHint}>카메라를 확인하고 자세를 준비하세요</p>
                        </>
                      ) : (
                        <>
                          <p className={styles.signingText}>지금 수어를 표현하세요!</p>
                          <div className={styles.signingIndicator}>🤟</div>
                          <div className={`${styles.signingTimer} ${signingTimer <= 3 ? styles.urgent : ''}`}>
                            남은 시간: {signingTimer}초
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 작은 플레이어 카드들 (아래) */}
        <div className={styles.smallPlayersGrid}>
          {players.map((player) => (
            <div 
              key={player.id} 
              className={`${styles.smallPlayerCard} ${player.isCurrentPlayer ? styles.currentPlayer : ''}`}
            >
              <div className={styles.smallWebcam}>
                <span>웹캠</span>
                {player.isCurrentPlayer && (
                  <div className={styles.currentPlayerBadge}>도전 중</div>
                )}
              </div>
              <div className={styles.smallPlayerInfo}>
                <span className={styles.smallPlayerName}>
                  {player.nickname}{player.isMe ? ' (나)' : ''}
                </span>
                <span className={styles.smallPlayerScore}>{player.score}점</span>
              </div>
            </div>
          ))}
        </div>

        {/* 테스트용 버튼들 (맨 밑) */}
        <div className={styles.testButtons}>
          <button 
            className={styles.testButton}
            onClick={() => setGamePhase('challenge')}
          >
            도전 신청 단계
          </button>
          <button 
            className={styles.testButton}
            onClick={() => setGamePhase('solving')}
          >
            문제 풀이 단계
          </button>
          <button 
            className={styles.testButton}
            onClick={handleMyTurn}
          >
            내 차례 (카운트다운)
          </button>
          <button 
            className={styles.testButton}
            onClick={handleNextChallenger}
          >
            다음 도전자
          </button>
          <button 
            className={styles.testButton}
            onClick={() => setShowResultModal(true)}
          >
            결과 모달 보기
          </button>
          <button 
            className={styles.testButton}
            onClick={() => {
              setCurrentQuestion(8);
              moveToNextQuestion();
            }}
          >
            게임 종료 (8번 문제)
          </button>
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

      {/* 토스트 알림 */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
      />

      {/* 게임 결과 모달 */}
      <GameResultModal
        isOpen={showResultModal}
        onReturnToRoom={handleReturnToRoom}
        rankings={rankings}
      />
    </div>
  );
};

export default QuizGamePage;
