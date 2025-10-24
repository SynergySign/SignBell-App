/**
 * @개요 대기방 WebSocket 이벤트 관리 커스텀 훅
 * @작성자 강관주
 * @작성일 2025-10-24
 */

import { useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocket/websocketService';

export const useWaitingRoomWebSocket = ({
  roomId,
  myUserId,
  isAuthenticated,
  hasCheckedAuth,
  waitingRoomState,
  onRoomJoin,
  onParticipantEvent,
  onRoomClosed,
  onGameStart,
  onError,
}) => {
  const isNavigatingToGameRef = useRef(false);

  // 핸들러 함수들을 ref로 저장하여 의존성 문제 해결
  const handlersRef = useRef({
    onRoomJoin,
    onParticipantEvent,
    onGameStart,
    onRoomClosed,
    onError,
  });

  // 핸들러가 변경될 때마다 ref 업데이트
  useEffect(() => {
    handlersRef.current = {
      onRoomJoin,
      onParticipantEvent,
      onGameStart,
      onRoomClosed,
      onError,
    };
  }, [onRoomJoin, onParticipantEvent, onGameStart, onRoomClosed, onError]);

  // WebSocket 연결 및 이벤트 리스너 등록
  useEffect(() => {
    if (!hasCheckedAuth || !isAuthenticated || !myUserId) {
      console.log('⏳ 인증 대기 중... WebSocket 연결 보류');
      return;
    }

    let isMounted = true;
    let hasJoinedRoom = false;

    // ref를 통해 최신 핸들러에 접근하는 래퍼 함수들
    const roomJoinHandler = (data) => handlersRef.current.onRoomJoin(data);
    const participantHandler = (data) => handlersRef.current.onParticipantEvent(data);
    const gameStartHandler = (data) => handlersRef.current.onGameStart(data);
    const roomClosedHandler = (data) => handlersRef.current.onRoomClosed(data);
    const errorHandler = (data) => handlersRef.current.onError(data);

    const initWebSocket = async () => {
      try {
        // 기존 리스너 제거 (중복 방지)
        websocketService.off('room:join', roomJoinHandler);
        websocketService.off('participant', participantHandler);
        websocketService.off('quiz:start', gameStartHandler);
        websocketService.off('room:closed', roomClosedHandler);
        websocketService.off('error', errorHandler);

        // 새 리스너 등록
        websocketService.on('room:join', roomJoinHandler);
        websocketService.on('participant', participantHandler);
        websocketService.on('quiz:start', gameStartHandler);
        websocketService.on('room:closed', roomClosedHandler);
        websocketService.on('error', errorHandler);

        await websocketService.connect();
        console.log('✅ WebSocket 연결 성공!');

        // 방 입장은 한 번만 실행
        if (!hasJoinedRoom) {
          setTimeout(() => {
            if (isMounted && !isNavigatingToGameRef.current && !hasJoinedRoom) {
              hasJoinedRoom = true;
              websocketService.joinRoom(Number(roomId));
              console.log(`🚪 방 ${roomId}에 입장 시도`);
            } else {
              console.log('⏭️ 게임 페이지로 이동 중이므로 방 입장 스킵');
            }
          }, 300);
        }

      } catch (error) {
        console.error('❌ WebSocket 연결 실패:', error);
        alert('연결 실패: ' + error.message);
      }
    };

    initWebSocket();

    return () => {
      isMounted = false;
      websocketService.off('room:join', roomJoinHandler);
      websocketService.off('participant', participantHandler);
      websocketService.off('quiz:start', gameStartHandler);
      websocketService.off('room:closed', roomClosedHandler);
      websocketService.off('error', errorHandler);
    };
  }, [roomId, myUserId, isAuthenticated, hasCheckedAuth]); // 함수들을 의존성에서 제거

  // 준비 상태 토글
  const toggleReady = useCallback((currentReady) => {
    const toggledReady = !currentReady;
    websocketService.setReady(Number(roomId), toggledReady);
    console.log(`✅ 준비 상태 전송됨: ${toggledReady}`);
    return toggledReady;
  }, [roomId]);

  // 게임 시작 요청
  const startGame = useCallback(() => {
    try {
      console.log('🎮 게임 시작 요청 전송 - roomId:', roomId);
      websocketService.startGame(Number(roomId));
    } catch (error) {
      console.error('❌ 게임 시작 요청 실패:', error);
      alert('게임 시작 요청에 실패했습니다: ' + error.message);
    }
  }, [roomId]);

  return {
    isNavigatingToGameRef,
    toggleReady,
    startGame,
  };
};
