/**
 * @개요 퀴즈 진행 페이지 컴포넌트 (리팩토링)
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-24
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Toast from '../../components/ui/Toast';
import GameResultModal from '../../components/quiz/GameResultModal';
import QuizHeader from '../../components/quiz/QuizHeader';
import QuizQuestion from '../../components/quiz/QuizQuestion';
import QuizMainVideo from '../../components/quiz/QuizMainVideo';
import QuizGameState from '../../components/quiz/QuizGameState';
import QuizPlayerGrid from '../../components/quiz/QuizPlayerGrid';
import QuizExitModal from '../../components/quiz/QuizExitModal';
import { useWebcamStore } from '../../store/webcam/webcamStore';
import { useJanus } from '../../contexts/JanusContext';
import { useAuthStore } from '../../store/auth/authStore';
import { useQuizGame } from '../../hooks/useQuizGame';
import { useQuizWebSocket } from '../../hooks/useQuizWebSocket';
import websocketService from '../../services/websocket/websocketService';
import * as quizFastApi from '../../services/quiz/quizFastApiWebSocket';
import styles from './QuizGamePage.module.scss';

const QuizGamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const myUserId = user?.userId;

  // 게임 상태 (커스텀 훅)
  const gameState = useQuizGame();

  // Janus WebRTC
  const {
    janusRef,
    pluginHandleRef,
    remoteFeedsRef,
    userIdToFeedIdRef,
    remoteStreams,
    setRemoteStreams,
    isJanusConnected,
    setIsJanusConnected,
  } = useJanus();

  // 웹캠
  const stream = useWebcamStore(state => state.stream);
  const isWebcamOn = useWebcamStore(state => state.isWebcamOn);
  const startWebcam = useWebcamStore(state => state.startWebcam);
  const toggleWebcam = useWebcamStore(state => state.toggleWebcam);

  // Refs
  const mainVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const webcamInitializedRef = useRef(false);

  // FastAPI WebSocket 관련 Refs
  const canvasRef = useRef(null);
  const recordingRef = useRef(null);
  const isRecordingRef = useRef(false);
  const lastSentRef = useRef(0);
  const [fastApiStatus, setFastApiStatus] = useState('Disconnected');

  // 모달
  const [showExitModal, setShowExitModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [rankings] = useState([]);

  // WebSocket 이벤트 핸들러
  const handleNewQuestion = useCallback((data) => {
    if (data.success && data.data) {
      const questionData = data.data;
      gameState.setCurrentQuestion(questionData.questionNumber);
      gameState.setCurrentWord(questionData.wordTitle);
      gameState.resetGameState();
      gameState.showToast(`문제 ${questionData.questionNumber}: ${questionData.wordTitle}`, 'info');
    }
  }, [gameState.setCurrentQuestion, gameState.setCurrentWord, gameState.resetGameState, gameState.showToast]);

  const handleChallengeUpdate = useCallback((data) => {
    if (data.success && data.data?.eventType === 'CHALLENGER_REGISTERED') {
      gameState.setChallengersCount(data.data.challengerCount);
    }
  }, [gameState.setChallengersCount]);

  const handlePersonalChallengeResponse = useCallback((data) => {
    if (data.success && data.data) {
      gameState.setChallengeOrder(data.data.order);
      gameState.showToast(`도전 신청 완료! ${data.data.order}번째 도전자`, 'success');
    }
  }, [gameState.setChallengeOrder, gameState.showToast]);

  const handleNextChallenger = useCallback((data) => {
    if (data.success && data.data) {
      const { userId: nextUserId, nickname, profileImage } = data.data;

      gameState.setPlayers(currentPlayers => {
        const player = currentPlayers.find(p => p.id === nextUserId);
        const score = player ? player.score : 0;

        gameState.setCurrentChallengerInfo({
          id: nextUserId,
          nickname,
          profileImage,
          score
        });

        const myInfo = currentPlayers.find(p => p.isMe);
        if (myInfo && myInfo.id === nextUserId) {
          gameState.setGamePhase('myTurn');
          gameState.setSolvingTimer(5);
          gameState.setSigningTimer(5);
          gameState.showToast('내 차례! 준비하세요!', 'info');
        } else {
          gameState.setGamePhase('solving');
          gameState.showToast(`${nickname}의 차례입니다.`, 'info');
        }

        return currentPlayers.map(player => ({
          ...player,
          isCurrentPlayer: player.id === nextUserId
        }));
      });
    }
  }, [gameState.setPlayers, gameState.setCurrentChallengerInfo, gameState.setGamePhase, gameState.setSolvingTimer, gameState.setSigningTimer, gameState.showToast]);

  // 프레임 캡처 및 전송 (25fps)
  const captureAndSendFrame = useCallback((timestamp) => {
    if (!isRecordingRef.current) return;
    recordingRef.current = requestAnimationFrame(captureAndSendFrame);

    if (!canvasRef.current || !mainVideoRef.current) return;

    const FPS = 25;
    const INTERVAL = 1000 / FPS;
    const now = typeof timestamp === 'number' ? timestamp : performance.now();

    if (now - (lastSentRef.current || 0) < INTERVAL) return;
    lastSentRef.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    try {
      const vw = mainVideoRef.current.videoWidth || 640;
      const vh = mainVideoRef.current.videoHeight || 480;

      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      ctx.drawImage(mainVideoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          quizFastApi.sendFrame(blob);
        }
      }, 'image/jpeg', 0.95);
    } catch (e) {
      console.error('[QuizGame] captureAndSendFrame error:', e);
    }
  }, []);

  // 5초 수어 동작 완료 시 FastAPI로 검증 요청
  const handleSigningComplete = useCallback(() => {
    console.log('⏰ 수어 동작 완료 - FastAPI 검증 요청');

    try {
      // 녹화 중지
      isRecordingRef.current = false;
      if (recordingRef.current) {
        cancelAnimationFrame(recordingRef.current);
        recordingRef.current = null;
      }

      gameState.setIsWaitingResult(true);
      gameState.showToast('AI 검증 중...', 'info');

      // FastAPI로 flush 요청 (AI 인식 결과 요청)
      quizFastApi.sendFlush();

      console.log('✅ FastAPI flush 요청 완료');
    } catch (error) {
      console.error('❌ FastAPI 검증 요청 실패:', error);
      gameState.showToast('검증 요청 실패', 'error');
      gameState.setIsWaitingResult(false);
    }
  }, [roomId, gameState, captureAndSendFrame]);

  const handleTimerUpdate = useCallback((data) => {
    if (data.success && data.data) {
      const { timerType, remainingSeconds } = data.data;

      if (timerType === 'CHALLENGE') {
        gameState.setTimer(remainingSeconds);
      } else if (timerType === 'PREPARE') {
        gameState.setSolvingTimer(remainingSeconds);

        // 준비 시간이 끝나면 (0초) 녹화 시작
        if (remainingSeconds === 0 && gameState.gamePhase === 'myTurn') {
          console.log('[QuizGame] 준비 완료 - 녹화 시작');
          isRecordingRef.current = true;
          lastSentRef.current = 0;
          recordingRef.current = requestAnimationFrame(captureAndSendFrame);
        }
      } else if (timerType === 'SIGNING') {
        gameState.setSigningTimer(remainingSeconds);

        if (remainingSeconds === 0 && gameState.gamePhase === 'myTurn') {
          handleSigningComplete();
        }
      }
    }
  }, [gameState.setTimer, gameState.setSolvingTimer, gameState.setSigningTimer, gameState.gamePhase, handleSigningComplete, captureAndSendFrame]);

  const handleAnswerResult = useCallback((data) => {
    if (data.success && data.data) {
      const result = data.data;
      gameState.setPlayers(prev =>
        prev.map(player =>
          player.id === result.userId
            ? { ...player, score: result.totalScore }
            : player
        )
      );

      if (result.isCorrect) {
        gameState.showToast(`정답! +${result.score}점`, 'success');
      } else {
        gameState.showToast(`오답! ${result.score}점`, 'error');
      }
    }
  }, [gameState.setPlayers, gameState.showToast]);

  const handleGameEnd = useCallback((data) => {
    if (data.success && data.data?.eventType === 'QUIZ_FINISHED') {
      setTimeout(() => setShowResultModal(true), 1000);
    }
  }, []);

  const handleChallengeTimeout = useCallback((data) => {
    if (data.success) {
      gameState.showToast(data.message || '도전 신청 시간 종료', 'info');
    }
  }, [gameState.showToast]);

  const handleError = useCallback((data) => {
    gameState.showToast(data.message || '오류 발생', 'error');
  }, [gameState.showToast]);

  // WebSocket 연결
  const { sendChallenge } = useQuizWebSocket({
    roomId,
    myUserId,
    gameState,
    onNewQuestion: handleNewQuestion,
    onChallengeUpdate: handleChallengeUpdate,
    onPersonalChallengeResponse: handlePersonalChallengeResponse,
    onNextChallenger: handleNextChallenger,
    onTimerUpdate: handleTimerUpdate,
    onAnswerResult: handleAnswerResult,
    onGameEnd: handleGameEnd,
    onChallengeTimeout: handleChallengeTimeout,
    onError: handleError,
  });

  // FastAPI WebSocket 메시지 리스너 등록
  useEffect(() => {
    // 상태 리스너
    const offStatus = quizFastApi.onStatus((status) => {
      setFastApiStatus(status);
      console.log('[QuizGame] FastAPI Status:', status);
    });

    // 메시지 리스너
    const offMessage = quizFastApi.onMessage((msg) => {
      console.log('[QuizGame] FastAPI Message:', msg);

      if (msg.type === 'meta_ack') {
        console.log('[QuizGame] ✅ FastAPI 메타 정보 전송 완료');
      } else if (msg.type === 'inference_result') {
        // AI 인식 결과 수신
        const result = msg.result || {};
        const predictedWord = result.predicted || '';
        const score = result.score || 0;

        console.log('[QuizGame] 🤖 AI 인식 결과:', { predictedWord, score });

        // Spring Boot 백엔드로 정답 제출
        try {
          websocketService.sendMessage(`/app/room/${roomId}/quiz/answer`, {
            questionNumber: gameState.currentQuestion,
            userAnswer: predictedWord,
          });
          console.log('[QuizGame] ✅ 정답 제출 완료:', predictedWord);
        } catch (error) {
          console.error('[QuizGame] ❌ 정답 제출 실패:', error);
        }

        gameState.showToast(`AI 인식: ${predictedWord} (${(score * 100).toFixed(1)}%)`, 'info');
      }
    });

    return () => {
      offStatus();
      offMessage();
    };
  }, [roomId]);

  // 내 차례가 되면 FastAPI WebSocket 연결
  useEffect(() => {
    if (gameState.gamePhase === 'myTurn' && gameState.currentWord) {
      console.log('[QuizGame] 내 차례 - FastAPI 연결 시작');

      // FastAPI 연결 (세션 ID 자동 생성)
      quizFastApi.connect();

      // 연결 상태 확인 후 메타 전송
      const offStatusLocal = quizFastApi.onStatus((status) => {
        if (status === 'Connected') {
          console.log('[QuizGame] FastAPI 연결 완료 - 메타 전송');
          quizFastApi.sendMeta(gameState.currentQuestion, gameState.currentWord);
        }
      });

      return () => {
        offStatusLocal();
        quizFastApi.disconnect();
      };
    }
  }, [gameState.gamePhase, gameState.currentWord, gameState.currentQuestion]);



  // 초기화
  useEffect(() => {
    if (location.state) {
      const { totalQuestions, firstQuestion, firstWord, participants, myUserId: myId } = location.state;

      if (totalQuestions) gameState.setTotalQuestions(totalQuestions);
      if (firstQuestion) gameState.setCurrentQuestion(firstQuestion);
      if (firstWord) gameState.setCurrentWord(firstWord);

      if (participants && participants.length > 0) {
        let actualMyUserId = myUserId || myId;

        if (!participants.some(p => p.userId === actualMyUserId)) {
          actualMyUserId = participants[0].userId;
        }

        const initialPlayers = participants.map(p => ({
          id: p.userId,
          nickname: p.nickname,
          score: 0,
          isMe: p.userId === actualMyUserId,
          isCurrentPlayer: false,
          hasChallenged: false,
          challengeOrder: null
        }));

        gameState.setPlayers(initialPlayers);
      } else {
        alert('참가자 정보를 불러올 수 없습니다.');
        navigate('/main');
      }
    }
  }, [location.state, myUserId, navigate, gameState.setTotalQuestions, gameState.setCurrentQuestion, gameState.setCurrentWord, gameState.setPlayers]);

  // 웹캠 초기화
  useEffect(() => {
    if (webcamInitializedRef.current || isWebcamOn) {
      webcamInitializedRef.current = true;
      return;
    }

    startWebcam()
      .then(() => {
        webcamInitializedRef.current = true;
      })
      .catch(() => {
        webcamInitializedRef.current = true;
      });
  }, [isWebcamOn, startWebcam]);

  // 메인 비디오 스트림 연결
  useEffect(() => {
    if (!stream) return;

    const timer = setTimeout(() => {
      if (mainVideoRef.current && stream) {
        mainVideoRef.current.srcObject = stream;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [stream]);

  // gamePhase가 myTurn으로 변경될 때 스트림 재연결
  useEffect(() => {
    if (gameState.gamePhase === 'myTurn' && stream && mainVideoRef.current) {
      const timer = setTimeout(() => {
        if (mainVideoRef.current && stream) {
          mainVideoRef.current.srcObject = stream;
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [gameState.gamePhase, stream]);

  // Janus WebRTC 연결
  useEffect(() => {
    if (isJanusConnected && janusRef.current) {
      return;
    }

    if (!isWebcamOn || !stream) {
      return;
    }

    if (!window.Janus) {
      console.error('❌ Janus 라이브러리가 로드되지 않았습니다.');
      return;
    }

    const actualUserId = myUserId;
    if (!actualUserId) {
      console.error('❌ 사용자 ID가 없습니다.');
      return;
    }

    const Janus = window.Janus;
    const JANUS_SERVER = import.meta.env.VITE_JANUS_SERVER || 'https://janus.jsflux.co.kr/janus';

    Janus.init({
      debug: false,
      callback: function () {
        janusRef.current = new Janus({
          server: JANUS_SERVER,
          success: function () {
            janusRef.current.attach({
              plugin: 'janus.plugin.videoroom',
              opaqueId: `game-user-${actualUserId}`,
              success: function (pluginHandle) {
                pluginHandleRef.current = pluginHandle;

                const register = {
                  request: 'join',
                  room: parseInt(roomId),
                  ptype: 'publisher',
                  display: String(actualUserId),
                };

                pluginHandle.send({ message: register });
              },
              error: function (error) {
                console.error('❌ 플러그인 연결 실패:', error);
              },
              onmessage: function (msg, jsep) {
                const event = msg['videoroom'];

                if (event === 'event' && msg['error_code'] === 426) {
                  const create = {
                    request: 'create',
                    room: parseInt(roomId),
                    description: `Game Room ${roomId}`,
                    publishers: 10,
                    bitrate: 128000,
                    fir_freq: 10,
                    audiocodec: 'opus',
                    videocodec: 'vp8',
                    audiolevel_event: true,
                    audio_level_average: 65,
                    audio_active_packets: 25,
                    record: false,
                    permanent: false
                  };

                  pluginHandleRef.current.send({
                    message: create,
                    success: function () {
                      const register = {
                        request: 'join',
                        room: parseInt(roomId),
                        ptype: 'publisher',
                        display: String(actualUserId),
                      };
                      pluginHandleRef.current.send({ message: register });
                    },
                    error: function (error) {
                      console.error('❌ Janus 방 생성 실패:', error);
                    }
                  });
                  return;
                }

                if (event === 'joined') {
                  setIsJanusConnected(true);

                  // 내 스트림 publish
                  pluginHandleRef.current.createOffer({
                    stream: stream,
                    media: {
                      audioRecv: false,
                      videoRecv: false,
                      audioSend: true,
                      videoSend: true,
                    },
                    success: function (jsep) {
                      const publish = {
                        request: 'configure',
                        audio: true,
                        video: true,
                      };
                      pluginHandleRef.current.send({ message: publish, jsep: jsep });
                    },
                    error: function (error) {
                      console.error('❌ Offer 생성 실패:', error);
                    },
                  });

                  // 기존 참가자 구독
                  if (msg['publishers']) {
                    msg['publishers'].forEach((publisher) => {
                      const userId = parseInt(publisher.display);
                      if (userId !== actualUserId) {
                        userIdToFeedIdRef.current[userId] = publisher.id;
                        subscribeToFeed(publisher.id, userId);
                      }
                    });
                  }
                } else if (event === 'event') {
                  // 새 참가자 입장
                  if (msg['publishers']) {
                    msg['publishers'].forEach((publisher) => {
                      const userId = parseInt(publisher.display);
                      if (userId !== actualUserId) {
                        userIdToFeedIdRef.current[userId] = publisher.id;
                        subscribeToFeed(publisher.id, userId);
                      }
                    });
                  }

                  // 참가자 퇴장
                  if (msg['leaving']) {
                    const leavingFeedId = msg['leaving'];
                    let leavingUserId = null;

                    for (const [userId, feedId] of Object.entries(userIdToFeedIdRef.current)) {
                      if (feedId === leavingFeedId) {
                        leavingUserId = parseInt(userId);
                        break;
                      }
                    }

                    if (remoteFeedsRef.current[leavingFeedId]) {
                      remoteFeedsRef.current[leavingFeedId].detach();
                      delete remoteFeedsRef.current[leavingFeedId];
                    }

                    if (leavingUserId) {
                      delete userIdToFeedIdRef.current[leavingUserId];
                      setRemoteStreams((prev) => {
                        const newStreams = { ...prev };
                        delete newStreams[leavingUserId];
                        return newStreams;
                      });
                    }
                  }
                }

                if (jsep) {
                  pluginHandleRef.current.handleRemoteJsep({ jsep: jsep });
                }
              },
              onlocalstream: function () { },
              onremotestream: function () { },
            });
          },
          error: function (error) {
            console.error('❌ Janus 서버 연결 실패:', error);
          },
          destroyed: function () { },
        });
      },
    });

    function subscribeToFeed(feedId, userId) {
      let remoteFeed = null;

      janusRef.current.attach({
        plugin: 'janus.plugin.videoroom',
        opaqueId: `subscriber-${actualUserId}-${feedId}`,
        success: function (pluginHandle) {
          remoteFeed = pluginHandle;

          const subscribe = {
            request: 'join',
            room: parseInt(roomId),
            ptype: 'subscriber',
            feed: feedId,
          };

          remoteFeed.send({ message: subscribe });
        },
        error: function (error) {
          console.error('❌ 구독 실패:', error);
        },
        onmessage: function (_msg, jsep) {
          if (jsep) {
            remoteFeed.createAnswer({
              jsep: jsep,
              media: { audioSend: false, videoSend: false },
              success: function (answerJsep) {
                const body = { request: 'start', room: parseInt(roomId) };
                remoteFeed.send({ message: body, jsep: answerJsep });
              },
              error: function (error) {
                console.error('❌ Answer 생성 실패:', error);
              },
            });
          }
        },
        onremotestream: function (remoteStream) {
          console.log(`📥 Janus 원격 스트림 수신 - userId: ${userId}, feedId: ${feedId}`, {
            streamId: remoteStream.id,
            active: remoteStream.active,
            tracks: remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
          });

          remoteFeedsRef.current[feedId] = remoteFeed;
          setRemoteStreams((prev) => ({
            ...prev,
            [userId]: remoteStream,
          }));
        },
      });
    }

    return () => { };
  }, [isWebcamOn, stream, roomId, isJanusConnected, myUserId, janusRef, pluginHandleRef, remoteFeedsRef, userIdToFeedIdRef, setRemoteStreams, setIsJanusConnected]);

  // 원격 스트림 연결
  useEffect(() => {
    console.log('🎥 원격 스트림 업데이트:', {
      remoteStreams: Object.keys(remoteStreams),
      currentChallengerId: gameState.currentChallengerInfo?.id,
      gamePhase: gameState.gamePhase
    });

    const timer = setTimeout(() => {
      Object.entries(remoteStreams).forEach(([userId, remoteStream]) => {
        const videoElement = remoteVideosRef.current[userId];
        console.log(`🎥 스트림 연결 시도 - userId: ${userId}`, {
          hasVideoElement: !!videoElement,
          hasStream: !!remoteStream,
          streamActive: remoteStream?.active
        });

        if (videoElement && remoteStream) {
          videoElement.srcObject = remoteStream;
          console.log(`✅ 스트림 연결 완료 - userId: ${userId}`);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [remoteStreams, gameState.gamePhase, gameState.currentChallengerInfo]);

  // 토스트 자동 닫기
  useEffect(() => {
    if (gameState.toast.isOpen) {
      const timer = setTimeout(() => gameState.closeToast(), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState.toast.isOpen, gameState.closeToast]);

  // 도전 신청
  const handleChallenge = useCallback(() => {
    const myInfo = gameState.players.find(p => p.isMe);

    if (!myInfo || myInfo.hasChallenged) {
      gameState.showToast('이미 도전 신청을 하셨습니다', 'warning');
      return;
    }

    if (gameState.challengersCount >= 4) {
      gameState.showToast('도전자가 모두 찼습니다', 'warning');
      return;
    }

    gameState.setHasChallenged(true);
    gameState.setPlayers(prev =>
      prev.map(player =>
        player.isMe ? { ...player, hasChallenged: true } : player
      )
    );

    try {
      sendChallenge();
    } catch (error) {
      gameState.showToast('도전 신청 실패', 'error');
    }
  }, [gameState.players, gameState.challengersCount, gameState.showToast, gameState.setHasChallenged, gameState.setPlayers, sendChallenge]);

  // 나가기
  const handleExit = () => setShowExitModal(true);
  const confirmExit = () => navigate('/main');
  const handleReturnToRoom = () => navigate(`/quiz/waiting/${roomId}`);

  return (
    <div className={styles.quizGamePage}>
      <QuizHeader
        roomId={roomId}
        isWebcamOn={isWebcamOn}
        onToggleWebcam={toggleWebcam}
        onExit={handleExit}
      />

      <main className={styles.gameContent}>
        <QuizQuestion
          currentQuestion={gameState.currentQuestion}
          totalQuestions={gameState.totalQuestions}
          word={gameState.currentWord || '문제를 불러오는 중...'}
        />

        <div className={styles.mainContentRow}>
          <QuizMainVideo
            gamePhase={gameState.gamePhase}
            isWebcamOn={isWebcamOn}
            mainVideoRef={mainVideoRef}
            currentChallengerInfo={gameState.currentChallengerInfo}
            remoteStreams={remoteStreams}
            remoteVideosRef={remoteVideosRef}
          />

          <QuizGameState
            gamePhase={gameState.gamePhase}
            timer={gameState.timer}
            challengersCount={gameState.challengersCount}
            maxChallengers={4}
            hasChallenged={gameState.hasChallenged}
            challengeOrder={gameState.challengeOrder}
            onChallenge={handleChallenge}
            currentChallengerInfo={gameState.currentChallengerInfo}
            solvingTimer={gameState.solvingTimer}
            signingTimer={gameState.signingTimer}
            isWaitingResult={gameState.isWaitingResult}
            resultMessage={gameState.resultMessage}
          />
        </div>

        <QuizPlayerGrid
          players={gameState.players}
          gamePhase={gameState.gamePhase}
          isWebcamOn={isWebcamOn}
          stream={stream}
          remoteStreams={remoteStreams}
          remoteVideosRef={remoteVideosRef}
        />
      </main>

      <QuizExitModal
        isOpen={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onConfirm={confirmExit}
      />

      <Toast
        isOpen={gameState.toast.isOpen}
        message={gameState.toast.message}
        type={gameState.toast.type}
      />

      <GameResultModal
        isOpen={showResultModal}
        onReturnToRoom={handleReturnToRoom}
        rankings={rankings}
      />

      {/* 숨겨진 캔버스 - 프레임 캡처용 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />
    </div>
  );
};

export default QuizGamePage;
