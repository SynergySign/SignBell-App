/**
 * @개요 퀴즈 대기방 WebSocket 연결 및 이벤트 처리 훅
 * @작성자 강관주 (Kanggwanju)
 * @작성일 2025-10-26
 */

import { useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocket/websocketService';

export const useWaitingRoomWebSocket = ({
  roomId,
  myUserId,
  isAuthenticated,
  hasCheckedAuth,
  isWebcamOn,
  isNavigatingToGameRef,
  onRoomJoin,
  onParticipantEvent,
  onGameStart,
  onRoomClosed,
  onError,
}) => {
  const hasJoinedRef = useRef(false); // 중복 입장 방지
  const isConnectingRef = useRef(false); // 연결 중 플래그
  
  // 콜백 함수들을 ref로 저장 (무한 루프 방지)
  const callbacksRef = useRef({
    onRoomJoin,
    onParticipantEvent,
    onGameStart,
    onRoomClosed,
    onError,
  });

  // 콜백 함수들 업데이트
  useEffect(() => {
    callbacksRef.current = {
      onRoomJoin,
      onParticipantEvent,
      onGameStart,
      onRoomClosed,
      onError,
    };
  }, [onRoomJoin, onParticipantEvent, onGameStart, onRoomClosed, onError]);

  // 방 입장
  useEffect(() => {
    if (!hasCheckedAuth || !isAuthenticated || !myUserId) {
      console.log('⏳ 인증 대기 중... WebSocket 연결 보류');
      return;
    }

    // 🔥 이미 연결 중이면 스킵
    if (isConnectingRef.current) {
      console.log('⏳ WebSocket 연결 중... 대기');
      return;
    }

    // 🔥 이미 입장했고 연결되어 있으면 스킵
    if (hasJoinedRef.current && websocketService.isConnected()) {
      console.log('⏭️ 이미 방에 입장함 - 재입장 스킵');
      return;
    }

    // 🔥 게임에서 복귀한 경우 플래그 리셋
    if (hasJoinedRef.current && !websocketService.isConnected()) {
      console.log('🔄 게임 복귀 감지 - 재입장 플래그 리셋');
      hasJoinedRef.current = false;
    }

    let isMounted = true;
    isConnectingRef.current = true;

    // 래퍼 함수들 (최신 콜백 참조)
    const handleRoomJoin = (data) => callbacksRef.current.onRoomJoin(data);
    const handleParticipantEvent = (data) => callbacksRef.current.onParticipantEvent(data);
    const handleGameStart = (data) => callbacksRef.current.onGameStart(data);
    const handleRoomClosed = (data) => callbacksRef.current.onRoomClosed(data);
    const handleError = (data) => callbacksRef.current.onError(data);

    const initWebSocket = async () => {
      try {
        websocketService.on('room:join', handleRoomJoin);
        websocketService.on('participant', handleParticipantEvent);
        websocketService.on('quiz:start', handleGameStart);
        websocketService.on('room:closed', handleRoomClosed);
        websocketService.on('error', handleError);

        await websocketService.connect();

        setTimeout(() => {
          if (isMounted && !isNavigatingToGameRef.current) {
            websocketService.joinRoom(Number(roomId));
            hasJoinedRef.current = true;
            isConnectingRef.current = false;
            console.log('✅ 방 입장 완료');
          }
        }, 300);

      } catch (error) {
        console.error('❌ WebSocket 연결 실패:', error);
        isConnectingRef.current = false;
        alert('연결 실패: ' + error.message);
      }
    };

    initWebSocket();

    return () => {
      isMounted = false;
      isConnectingRef.current = false;
      websocketService.off('room:join', handleRoomJoin);
      websocketService.off('participant', handleParticipantEvent);
      websocketService.off('quiz:start', handleGameStart);
      websocketService.off('room:closed', handleRoomClosed);
      websocketService.off('error', handleError);
    };
  }, [roomId, myUserId, isAuthenticated, hasCheckedAuth]); // 콜백 함수들 제거

  // 준비 상태 전송
  const sendReady = useCallback((isReady) => {
    websocketService.setReady(Number(roomId), isReady);
    console.log(`✅ 준비 상태 전송됨: ${isReady}`);
  }, [roomId]);

  // 게임 시작 요청
  const sendStartGame = useCallback(() => {
    try {
      console.log('🎮 게임 시작 요청 전송 - roomId:', roomId);
      websocketService.startGame(Number(roomId));
      isNavigatingToGameRef.current = true;
    } catch (error) {
      console.error('❌ 게임 시작 요청 실패:', error);
      alert('게임 시작 요청에 실패했습니다: ' + error.message);
    }
  }, [roomId]);

  return {
    sendReady,
    sendStartGame,
  };
};
