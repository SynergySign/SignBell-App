/**
 * @개요 퀴즈 진행 페이지 컴포넌트 (리팩토링)
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-26 (FastAPI WebSocket 연결 수정)
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
import { useRoomExit } from '../../hooks/useRoomExit';
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
  const fastApiConnectedRef = useRef(false);  // 🆕 연결 상태 추적
  const metaSentRef = useRef(false);  // 🆕 메타 전송 여부 추적
  const currentQuestionRef = useRef(1);  // 🆕 현재 문제 번호 추적 (클로저 문제 해결)

  // 모달
  const [showExitModal, setShowExitModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [rankings, setRankings] = useState([]);

  // WebSocket 이벤트 핸들러
  const handleNewQuestion = useCallback((data) => {
    if (data.success && data.data) {
      const questionData = data.data;

      // 🔥 진행 중인 녹화 중단
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        if (recordingRef.current) {
          cancelAnimationFrame(recordingRef.current);
          recordingRef.current = null;
        }
      }

      // 상태 초기화
      gameState.setCurrentQuestion(questionData.questionNumber);
      gameState.setCurrentWord(questionData.wordTitle);
      gameState.resetGameState();
      gameState.setIsWaitingResult(false);
      gameState.setAnswerResult(null);
      gameState.showToast(`문제 ${questionData.questionNumber}: ${questionData.wordTitle}`, 'info');

      // 🆕 현재 문제 번호 ref 업데이트 (클로저 문제 해결)
      currentQuestionRef.current = questionData.questionNumber;

      // 🆕 새 문제면 메타 전송 플래그 리셋
      metaSentRef.current = false;
    }
  }, [gameState]);

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
    console.log('🎯 handleNextChallenger 호출:', data);

    if (data.success && data.data) {
      const { userId: nextUserId, nickname, profileImage } = data.data;

      console.log('🎯 다음 도전자 설정:', { nextUserId, nickname });

      // 🔥 진행 중인 녹화 중단 (다른 사람 차례로 넘어갈 때)
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        if (recordingRef.current) {
          cancelAnimationFrame(recordingRef.current);
          recordingRef.current = null;
        }
      }

      // 대기 상태 초기화
      gameState.setIsWaitingResult(false);
      gameState.setAnswerResult(null);

      gameState.setPlayers(currentPlayers => {
        const player = currentPlayers.find(p => p.id === nextUserId);
        const score = player ? player.score : 0;

        gameState.setCurrentChallengerInfo({
          id: nextUserId,
          nickname,
          profileImage,
          score
        });

        console.log('✅ currentChallengerInfo 업데이트 완료:', { id: nextUserId, nickname });

        const myInfo = currentPlayers.find(p => p.isMe);

        if (myInfo && myInfo.id === nextUserId) {
          gameState.setGamePhase('myTurn');
          gameState.setSolvingTimer(5);
          gameState.setSigningTimer(5);
          gameState.showToast('내 차례! 준비하세요!', 'info');
          console.log('✅ 내 차례로 설정 완료');
        } else {
          gameState.setGamePhase('solving');
          gameState.showToast(`${nickname}의 차례입니다.`, 'info');
          console.log('✅ 다른 사람 차례로 설정 완료');
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

      // 점수 업데이트
      gameState.setPlayers(prev =>
        prev.map(player =>
          player.id === result.userId
            ? { ...player, score: result.totalScore }
            : player
        )
      );

      // 결과 정보 저장 (화면에 표시용)
      gameState.setAnswerResult(result);

      // 게임 단계를 'result'로 변경 (3초간 결과 표시)
      gameState.setGamePhase('result');

      // 결과 상세 정보 콘솔 출력
      console.log('📊 정답 결과 상세:', {
        도전자: result.nickname,
        정답여부: result.isCorrect ? '✅ 정답' : '❌ 오답',
        제출답변: result.userAnswer,
        정답: result.correctAnswer,
        신뢰도: result.confidenceScore ? `${(result.confidenceScore * 100).toFixed(1)}%` : 'N/A',
        획득점수: result.score,
        누적점수: result.totalScore
      });

      // 3초 후 자동으로 다음 단계로 (백엔드에서 처리)
      // 백엔드가 3초 후 다음 문제 또는 다음 도전자 메시지를 보냄
    }
  }, [gameState.setPlayers, gameState.setAnswerResult, gameState.setGamePhase]);

  const handleGameEnd = useCallback((data) => {
    if (data.success && data.data?.eventType === 'QUIZ_FINISHED') {
      // Remote feeds 정리
      if (remoteFeedsRef.current) {
        Object.values(remoteFeedsRef.current).forEach(feed => {
          try {
            if (feed && typeof feed.detach === 'function') {
              feed.detach();
            }
          } catch (error) {
            console.error('Remote feed detach 실패:', error);
          }
        });
        remoteFeedsRef.current = {};
      }

      // Remote streams 초기화
      setRemoteStreams({});

      // UserID to FeedID 매핑 초기화
      if (userIdToFeedIdRef.current) {
        userIdToFeedIdRef.current = {};
      }

      // Publisher (내 플러그인)도 Janus 방에서 떠나기
      if (pluginHandleRef.current) {
        try {
          const leave = { request: 'leave' };
          pluginHandleRef.current.send({ message: leave });
        } catch (error) {
          console.error('Janus leave 실패:', error);
        }
      }

      // 순위 정보 저장
      if (data.data.rankings) {
        setRankings(data.data.rankings);
      }

      // 1초 후 순위 모달 표시
      setTimeout(() => setShowResultModal(true), 1000);
    }
  }, [remoteFeedsRef, setRemoteStreams, userIdToFeedIdRef, remoteStreams, pluginHandleRef]);

  const handleChallengeTimeout = useCallback((data) => {
    if (data.success) {
      gameState.showToast(data.message || '도전 신청 시간 종료', 'info');
    }
  }, [gameState.showToast]);

  const handleParticipantLeft = useCallback((data) => {
    console.log('📥 참가자 퇴장 이벤트 수신:', JSON.stringify(data, null, 2));

    if (data.success && data.data) {
      const eventData = data.data;

      if (eventData.eventType === 'PARTICIPANT_LEFT') {
        const leftUserId = eventData.participant?.userId;
        const leftNickname = eventData.participant?.nickname;
        const nextChallengerId = eventData.nextChallengerId;

        console.log(`👋 참가자 퇴장 상세:`, {
          leftUserId,
          leftNickname,
          nextChallengerId,
          currentChallengerInfo: gameState.currentChallengerInfo,
          currentPlayers: gameState.players.map(p => ({ id: p.id, nickname: p.nickname }))
        });

        // 1. 현재 도전자가 퇴장했는지 확인
        const wasCurrentChallenger = gameState.currentChallengerInfo?.id === leftUserId;

        // 2. 다음 도전자 정보 미리 조회 (참가자 제거 전에!)
        let nextPlayerInfo = null;
        if (wasCurrentChallenger && nextChallengerId) {
          const currentPlayers = gameState.players;
          nextPlayerInfo = currentPlayers.find(p => p.id === nextChallengerId);
          console.log(`🔍 다음 도전자 정보 조회: `, nextPlayerInfo);
        }

        // 3. 참가자 목록에서 완전히 제거
        gameState.setPlayers(prev => prev.filter(p => p.id !== leftUserId));

        // 4. 현재 도전자가 퇴장한 경우 처리
        if (wasCurrentChallenger) {
          console.log('⚠️ 현재 도전자가 퇴장했습니다');

          // 녹화 중이었다면 중단
          if (isRecordingRef.current) {
            isRecordingRef.current = false;
            if (recordingRef.current) {
              cancelAnimationFrame(recordingRef.current);
              recordingRef.current = null;
            }
            console.log('🔴 녹화 중단 - 도전자 퇴장');
          }

          // 대기 상태 초기화
          gameState.setIsWaitingResult(false);

          // 다음 도전자가 있으면 백엔드에서 자동으로 처리됨
          // handleNextChallenger에서 처리되므로 여기서는 로그만 남김
          if (nextPlayerInfo) {
            console.log(`🔄 다음 도전자 정보 확인: ${nextPlayerInfo.nickname} (백엔드에서 자동 전환 예정)`);
          } else {
            console.log('⏳ 다음 도전자 없음 - 다음 문제 대기 중...');
            gameState.setGamePhase('challenge');
          }
        }

        // 5. Remote stream 정리
        if (remoteFeedsRef.current) {
          const feedId = userIdToFeedIdRef.current[leftUserId];
          if (feedId && remoteFeedsRef.current[feedId]) {
            try {
              remoteFeedsRef.current[feedId].detach();
              delete remoteFeedsRef.current[feedId];
              console.log(`✅ Remote feed 정리 완료 - userId: ${leftUserId}, feedId: ${feedId}`);
            } catch (error) {
              console.error('❌ Remote feed detach 실패:', error);
            }
          }
        }

        // 6. Remote stream 상태 업데이트
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[leftUserId];
          return newStreams;
        });

        // 7. UserID to FeedID 매핑 제거
        if (userIdToFeedIdRef.current[leftUserId]) {
          delete userIdToFeedIdRef.current[leftUserId];
        }

        // 8. 토스트 알림
        gameState.showToast(`${leftNickname}님이 퇴장했습니다`, 'info');

        // 9. 방 종료 확인
        if (eventData.roomClosed) {
          console.log('🚪 방장이 나가서 방이 종료됨');
          gameState.showToast('방장이 나가서 게임이 종료되었습니다', 'warning');

          // 녹화 중단
          if (isRecordingRef.current) {
            isRecordingRef.current = false;
            if (recordingRef.current) {
              cancelAnimationFrame(recordingRef.current);
              recordingRef.current = null;
            }
          }

          // 3초 후 메인으로 이동
          setTimeout(() => {
            navigate('/main');
          }, 3000);
        }
      }
    }
  }, [gameState, remoteFeedsRef, userIdToFeedIdRef, setRemoteStreams, navigate, isRecordingRef, recordingRef]);

  const handleError = useCallback((data) => {
    console.error('게임 에러:', data);

    // 진행 중인 녹화 중단
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      if (recordingRef.current) {
        cancelAnimationFrame(recordingRef.current);
        recordingRef.current = null;
      }
    }

    // 대기 상태 초기화
    gameState.setIsWaitingResult(false);

    // 게임 상태를 challenge로 되돌림 (다시 도전 신청 가능)
    gameState.setGamePhase('challenge');

    gameState.showToast(data.message || '오류 발생', 'error');
  }, [gameState]);

  // WebSocket 연결
  const { sendChallenge, sendAnswer } = useQuizWebSocket({
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
    onParticipantLeft: handleParticipantLeft,
    onError: handleError,
  });

  // 🔥 FastAPI WebSocket 연결 (한 번만! 컴포넌트 전체 생명주기 동안 유지)
  useEffect(() => {
    // 이미 연결되어 있으면 중복 연결 방지
    if (fastApiConnectedRef.current) {
      return;
    }

    // 세션 ID 생성
    const fastApiSessionId = `quiz-${roomId}-${myUserId}-${Date.now()}`;

    // 연결
    quizFastApi.connect(fastApiSessionId);
    fastApiConnectedRef.current = true;

    // 상태 리스너 등록
    const unsubscribeStatus = quizFastApi.onStatus((status) => {
      console.log('[QuizGame] FastAPI Status:', status);
      setFastApiStatus(status);
    });

    // 메시지 리스너 등록
    const unsubscribeMessage = quizFastApi.onMessage((msg) => {
      console.log('[QuizGame] FastAPI Message:', msg);

      if (msg.type === 'meta_ack') {
        console.log('[QuizGame] ✅ FastAPI 메타 정보 전송 완료');
      } else if (msg.type === 'inference_result') {
        // AI 인식 결과 수신
        const result = msg.result || {};
        const predictedWord = result.predicted || '';
        const confidenceScore = result.score || 0;

        console.log('[QuizGame] 🤖 AI 인식 결과:', { predictedWord, confidenceScore });

        // Spring Boot 백엔드로 정답 제출 (신뢰도 점수 포함)
        try {
          // 🔥 최신 문제 번호 사용 (클로저 문제 해결)
          const currentQuestionNumber = currentQuestionRef.current;

          websocketService.sendMessage(`/app/room/${roomId}/quiz/answer`, {
            questionNumber: currentQuestionNumber,
            userAnswer: predictedWord,
            confidenceScore: confidenceScore,  // 신뢰도 점수 추가
          });
          console.log('[QuizGame] ✅ 정답 제출 완료:', {
            questionNumber: currentQuestionNumber,
            predictedWord,
            confidenceScore
          });
        } catch (error) {
          console.error('[QuizGame] ❌ 정답 제출 실패:', error);
        }

        gameState.setIsWaitingResult(false);
        gameState.showToast(`AI 인식: ${predictedWord} (${(confidenceScore * 100).toFixed(1)}%)`, 'info');
      }
    });

    // 🔥 컴포넌트 완전히 언마운트될 때만 연결 해제
    return () => {
      console.log('[QuizGame] 🔌 컴포넌트 언마운트 - FastAPI 연결 해제');
      unsubscribeStatus();
      unsubscribeMessage();
      quizFastApi.disconnect();
      fastApiConnectedRef.current = false;
      metaSentRef.current = false;
    };
  }, []);  // 🔥 빈 배열! = 마운트 시 1회만 실행

  // 🔥 내 차례가 되면 메타데이터 전송 (연결은 유지하고 메타만 전송)
  useEffect(() => {
    if (gameState.gamePhase === 'myTurn' && gameState.currentWord && !metaSentRef.current) {
      console.log('[QuizGame] 내 차례 - 단어 정보 FastAPI로 전송:', gameState.currentWord);

      // 🔥 현재 문제 번호 ref 업데이트
      currentQuestionRef.current = gameState.currentQuestion;

      // 연결 상태 확인
      if (fastApiStatus === 'Connected') {
        quizFastApi.sendMeta(gameState.currentQuestion, gameState.currentWord);
        metaSentRef.current = true;
      } else {
        // 연결이 안 되어 있으면 잠시 후 재시도
        console.log('[QuizGame] FastAPI 연결 대기 중...');
        const retryTimer = setTimeout(() => {
          if (quizFastApi.getStatus() === 'Connected') {
            quizFastApi.sendMeta(gameState.currentQuestion, gameState.currentWord);
            metaSentRef.current = true;
          }
        }, 1000);

        return () => clearTimeout(retryTimer);
      }
    }
  }, [gameState.gamePhase, gameState.currentWord, gameState.currentQuestion, fastApiStatus]);

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

  // 메인 비디오 스트림 연결은 QuizMainVideo 컴포넌트에서 처리

  // Janus 연결
  useEffect(() => {
    if (isJanusConnected || !stream || !isWebcamOn) {
      return;
    }

    const actualUserId = myUserId;

    console.log(`🔗 Janus 초기화 시작 - userId: ${actualUserId}, roomId: ${roomId}`);

    window.Janus.init({
      debug: 'all',
      callback: function () {
        if (!window.Janus.isWebrtcSupported()) {
          alert('WebRTC를 지원하지 않는 브라우저입니다.');
          return;
        }

        janusRef.current = new window.Janus({
          server: 'https://localhost:8443/janus',
          success: function () {
            console.log('✅ Janus 서버 연결 성공');

            janusRef.current.attach({
              plugin: 'janus.plugin.videoroom',
              opaqueId: `publisher-${actualUserId}`,
              success: function (pluginHandle) {
                console.log('✅ VideoRoom 플러그인 연결 성공');
                pluginHandleRef.current = pluginHandle;
                setIsJanusConnected(true);

                const register = {
                  request: 'join',
                  room: parseInt(roomId),
                  ptype: 'publisher',
                  id: parseInt(actualUserId),
                  display: `User-${actualUserId}`,
                };

                pluginHandle.send({ message: register });
              },
              error: function (error) {
                console.error('❌ 플러그인 연결 실패:', error);
              },
              mediaState: function (medium, on) {
                console.log(`🎥 미디어 상태 변경 - ${medium}: ${on ? 'ON' : 'OFF'}`);
              },
              webrtcState: function (isConnected) {
                console.log(`🔗 WebRTC 상태: ${isConnected ? '연결됨' : '연결 끊김'}`);
              },
              onmessage: function (msg, jsep) {
                const event = msg['videoroom'];

                if (event === 'joined') {
                  console.log('✅ VideoRoom 참여 성공:', msg);

                  const myId = msg['id'];
                  console.log(`📌 내 Publisher ID: ${myId}`);

                  pluginHandleRef.current.createOffer({
                    media: { video: true, audio: true },
                    success: function (offerJsep) {
                      const publish = { request: 'configure', audio: true, video: true };
                      pluginHandleRef.current.send({ message: publish, jsep: offerJsep });
                    },
                    error: function (error) {
                      console.error('❌ Offer 생성 실패:', error);
                    },
                  });

                  if (msg['publishers']) {
                    const publishers = msg['publishers'];
                    console.log(`📡 기존 Publisher ${publishers.length}명 발견:`, publishers);

                    publishers.forEach((pub) => {
                      const feedId = pub['id'];
                      const userId = pub['display']?.replace('User-', '');
                      console.log(`🔍 Publisher 발견 - feedId: ${feedId}, userId: ${userId}`);

                      if (userId && feedId) {
                        userIdToFeedIdRef.current[userId] = feedId;
                        subscribeToFeed(feedId, userId);
                      }
                    });
                  }
                } else if (event === 'event') {
                  if (msg['publishers']) {
                    const publishers = msg['publishers'];
                    console.log(`📢 새로운 Publisher ${publishers.length}명 참여:`, publishers);

                    publishers.forEach((pub) => {
                      const feedId = pub['id'];
                      const userId = pub['display']?.replace('User-', '');
                      console.log(`🆕 새 Publisher - feedId: ${feedId}, userId: ${userId}`);

                      if (userId && feedId) {
                        userIdToFeedIdRef.current[userId] = feedId;
                        subscribeToFeed(feedId, userId);
                      }
                    });
                  }

                  if (msg['leaving']) {
                    const leavingFeedId = msg['leaving'];
                    console.log(`👋 Publisher 퇴장 - feedId: ${leavingFeedId}`);

                    const leavingUserId = Object.keys(userIdToFeedIdRef.current).find(
                      (uid) => userIdToFeedIdRef.current[uid] === leavingFeedId
                    );

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

        if (videoElement && remoteStream && videoElement.srcObject !== remoteStream) {
          videoElement.srcObject = remoteStream;
          console.log(`✅ 스트림 연결 완료 - userId: ${userId}`);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [remoteStreams]); // gamePhase와 currentChallengerInfo 제거 - 불필요한 리렌더링 방지

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

  // 웹캠 스토어에서 stopWebcam 가져오기
  const stopWebcam = useWebcamStore(state => state.stopWebcam);

  // 퇴장 훅 사용 (공통 퇴장 로직)
  const { cleanupAndExit } = useRoomExit({
    janusRef,
    pluginHandleRef,
    remoteFeedsRef,
    userIdToFeedIdRef,
    setRemoteStreams,
    setIsJanusConnected,
    stopWebcam,
    isWebcamOn,
    navigateTo: '/main',
    onBeforeExit: async () => {
      // 게임 전용 정리 작업
      console.log('🎮 게임 전용 리소스 정리 시작');

      // 1. 녹화 중단
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        if (recordingRef.current) {
          cancelAnimationFrame(recordingRef.current);
          recordingRef.current = null;
        }
        console.log('✅ 녹화 중단 완료');
      }

      // 2. FastAPI WebSocket 연결 해제
      try {
        quizFastApi.disconnect();
        fastApiConnectedRef.current = false;
        metaSentRef.current = false;
        console.log('✅ FastAPI 연결 해제 완료');
      } catch (error) {
        console.error('❌ FastAPI 연결 해제 실패:', error);
      }
    }
  });

  // 나가기 버튼 핸들러
  const handleExit = () => setShowExitModal(true);
  const confirmExit = () => cleanupAndExit();

  const handleReturnToRoom = async () => {
    console.log('🚪 대기실로 돌아가기 요청');

    // 0. 녹화 중단
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      if (recordingRef.current) {
        cancelAnimationFrame(recordingRef.current);
        recordingRef.current = null;
      }
      console.log('✅ 녹화 중단 완료');
    }

    // 0-1. FastAPI WebSocket 연결 해제
    try {
      quizFastApi.disconnect();
      fastApiConnectedRef.current = false;
      metaSentRef.current = false;
      console.log('✅ FastAPI 연결 해제 완료');
    } catch (error) {
      console.error('❌ FastAPI 연결 해제 실패:', error);
    }

    // 1. WebRTC 연결 완전 정리
    console.log('🧹 대기실 복귀 - WebRTC 연결 완전 정리 시작');

    // 1-1. Remote feeds 정리
    if (remoteFeedsRef.current && Object.keys(remoteFeedsRef.current).length > 0) {
      console.log('⚠️ Remote feeds 정리:', Object.keys(remoteFeedsRef.current).length);
      Object.values(remoteFeedsRef.current).forEach(feed => {
        try {
          if (feed && typeof feed.detach === 'function') {
            console.log('🔌 Remote feed detach');
            feed.detach();
          }
        } catch (error) {
          console.error('❌ Remote feed detach 실패:', error);
        }
      });
      remoteFeedsRef.current = {};
    }

    // 1-2. Publisher (내 플러그인 핸들) 정리 - Janus 방 떠나기
    if (pluginHandleRef.current) {
      console.log('🔌 Publisher plugin - Janus 방 떠나기');
      try {
        // 🆕 Janus 방을 명시적으로 떠나기 (Promise로 처리)
        await new Promise((resolve) => {
          const leave = { request: 'leave' };
          pluginHandleRef.current.send({
            message: leave,
            success: () => {
              console.log('✅ Janus 방 떠나기 성공');
              resolve();
            },
            error: (error) => {
              console.error('❌ Janus 방 떠나기 실패:', error);
              resolve(); // 실패해도 계속 진행
            }
          });

          // 타임아웃 (500ms 후 강제 진행)
          setTimeout(resolve, 500);
        });

        // detach
        pluginHandleRef.current.detach();
        pluginHandleRef.current = null;
      } catch (error) {
        console.error('❌ Publisher 정리 실패:', error);
        pluginHandleRef.current = null;
      }
    }

    // 1-3. Janus 연결 종료
    if (janusRef.current) {
      console.log('🔌 Janus 연결 종료');
      try {
        janusRef.current.destroy();
      } catch (error) {
        console.error('❌ Janus destroy 실패:', error);
      }
      janusRef.current = null;
    }

    // 1-4. 상태 초기화
    setRemoteStreams({});
    setIsJanusConnected(false);
    if (userIdToFeedIdRef.current) {
      userIdToFeedIdRef.current = {};
    }

    console.log('✅ 대기실 복귀 - WebRTC 연결 완전 정리 완료');

    // 2. 바로 대기실로 이동 (WebSocket 재연결을 통해 참가자 정보 받음)
    console.log('🚪 대기실 페이지로 즉시 이동');
    navigate(`/quiz/waiting/${roomId}`, {
      state: {
        returnFromGame: true,
        needsRejoin: true // 🆕 재입장 필요 플래그
      }
    });
  };

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
            stream={stream}
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
            answerResult={gameState.answerResult}
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