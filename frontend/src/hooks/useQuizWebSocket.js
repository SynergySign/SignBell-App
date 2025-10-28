import { useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocket/websocketService';

/**
 * 퀴즈 WebSocket 이벤트 처리 훅
 */
export const useQuizWebSocket = ({
  roomId,
  myUserId,
  gameState,
  onNewQuestion,
  onChallengeUpdate,
  onPersonalChallengeResponse,
  onNextChallenger,
  onTimerUpdate,
  onAnswerResult,
  onGameEnd,
  onChallengeTimeout,
  onParticipantLeft,
  onError,
}) => {
  // 최신 콜백을 ref로 저장 (의존성 배열 문제 해결)
  const handlersRef = useRef({
    onNewQuestion,
    onChallengeUpdate,
    onPersonalChallengeResponse,
    onNextChallenger,
    onTimerUpdate,
    onAnswerResult,
    onGameEnd,
    onChallengeTimeout,
    onParticipantLeft,
    onError,
  });

  // 콜백이 변경될 때마다 ref 업데이트
  useEffect(() => {
    handlersRef.current = {
      onNewQuestion,
      onChallengeUpdate,
      onPersonalChallengeResponse,
      onNextChallenger,
      onTimerUpdate,
      onAnswerResult,
      onGameEnd,
      onChallengeTimeout,
      onParticipantLeft,
      onError,
    };
  });

  // 도전 신청
  const sendChallenge = useCallback(() => {
    try {
      websocketService.sendMessage(`/app/room/${roomId}/quiz/challenge`, {
        questionNumber: gameState.currentQuestion
      });
    } catch (error) {
      console.error('❌ 도전 신청 전송 실패:', error);
      throw error;
    }
  }, [roomId, gameState.currentQuestion]);

  // 정답 제출
  const submitAnswer = useCallback((userAnswer) => {
    try {
      websocketService.sendMessage(`/app/room/${roomId}/quiz/answer`, {
        questionNumber: gameState.currentQuestion,
        userAnswer: userAnswer
      });
    } catch (error) {
      console.error('❌ 정답 제출 실패:', error);
      throw error;
    }
  }, [roomId, gameState.currentQuestion]);

  // WebSocket 이벤트 핸들러 등록 (roomId가 변경될 때만 실행)
  useEffect(() => {
    if (!websocketService.isConnected()) {
      console.warn('⚠️ WebSocket이 연결되어 있지 않습니다');
      return;
    }

    console.log('🔌 WebSocket 구독 시작:', roomId);

    // 토픽 구독
    websocketService.subscribeToGameTopics(Number(roomId));

    // ref를 통해 최신 핸들러를 호출하는 래퍼 함수들
    const wrappers = {
      question: (data) => handlersRef.current.onNewQuestion(data),
      challenge: (data) => handlersRef.current.onChallengeUpdate(data),
      challengePersonal: (data) => handlersRef.current.onPersonalChallengeResponse(data),
      challenger: (data) => handlersRef.current.onNextChallenger(data),
      timer: (data) => handlersRef.current.onTimerUpdate(data),
      answer: (data) => handlersRef.current.onAnswerResult(data),
      result: (data) => handlersRef.current.onGameEnd(data),
      timeout: (data) => handlersRef.current.onChallengeTimeout(data),
      participantLeft: (data) => handlersRef.current.onParticipantLeft?.(data),
      error: (data) => handlersRef.current.onError(data),
    };

    // 이벤트 핸들러 등록
    websocketService.on('quiz:question', wrappers.question);
    websocketService.on('quiz:challenge', wrappers.challenge);
    websocketService.on('quiz:challenge:personal', wrappers.challengePersonal);
    websocketService.on('quiz:challenger', wrappers.challenger);
    websocketService.on('quiz:timer', wrappers.timer);
    websocketService.on('quiz:answer', wrappers.answer);
    websocketService.on('quiz:result', wrappers.result);
    websocketService.on('quiz:timeout', wrappers.timeout);
    websocketService.on('participant', wrappers.participantLeft);
    websocketService.on('error', wrappers.error);

    return () => {
      websocketService.off('quiz:question', wrappers.question);
      websocketService.off('quiz:challenge', wrappers.challenge);
      websocketService.off('quiz:challenge:personal', wrappers.challengePersonal);
      websocketService.off('quiz:challenger', wrappers.challenger);
      websocketService.off('quiz:timer', wrappers.timer);
      websocketService.off('quiz:answer', wrappers.answer);
      websocketService.off('quiz:result', wrappers.result);
      websocketService.off('quiz:timeout', wrappers.timeout);
      websocketService.off('participant', wrappers.participantLeft);
      websocketService.off('error', wrappers.error);
      
      websocketService.unsubscribeFromGameTopics(Number(roomId));
    };
  }, [roomId]); // roomId만 의존성으로!

  return {
    sendChallenge,
    submitAnswer,
  };
};
