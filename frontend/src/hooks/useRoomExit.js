/**
 * 퀴즈 방 퇴장을 위한 공통 훅
 * 
 * 🔥 중요: 백엔드에는 명시적인 퇴장 API가 없습니다!
 * 이 훅은 단순히 websocketService.disconnect()를 호출하고,
 * 백엔드가 DISCONNECT 이벤트를 감지하여 자동으로 퇴장 처리합니다.
 * 
 * 처리 순서:
 * 1. 게임 전용 리소스 정리 (onBeforeExit)
 * 2. Janus WebRTC 정리
 * 3. 웹캠 정리
 * 4. WebSocket 연결 해제 ⭐ (백엔드가 자동으로 퇴장 처리)
 * 5. 페이지 이동
 * 
 * @author 강관주 (Kanggwanju)
 * @since 2025-10-26
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import websocketService from '../services/websocket/websocketService';

export const useRoomExit = ({
  janusRef,
  pluginHandleRef,
  remoteFeedsRef,
  userIdToFeedIdRef,
  setRemoteStreams,
  setIsJanusConnected,
  stopWebcam,
  isWebcamOn,
  navigateTo = '/main',
  onBeforeExit = null, // 퇴장 전 추가 작업 (게임 페이지: 녹화 중단, FastAPI 해제)
}) => {
  const navigate = useNavigate();
  
  const cleanupAndExit = useCallback(async () => {
    try {
      console.log('🚪 방 나가기 처리 시작');
      
      // 0. 퇴장 전 추가 작업 실행 (옵션)
      // 게임 페이지: 녹화 중단, FastAPI WebSocket 해제
      if (onBeforeExit) {
        await onBeforeExit();
      }
      
      // 1. Janus WebRTC 정리
      if (janusRef.current) {
        try {
          // Remote feeds 정리
          if (remoteFeedsRef.current) {
            Object.values(remoteFeedsRef.current).forEach(feed => {
              try {
                if (feed && typeof feed.detach === 'function') {
                  feed.detach();
                }
              } catch (error) {
                console.error('❌ Remote feed detach 실패:', error);
              }
            });
            remoteFeedsRef.current = {};
          }
          
          // Publisher 정리
          if (pluginHandleRef.current) {
            try {
              pluginHandleRef.current.detach();
            } catch (error) {
              console.error('❌ Plugin detach 실패:', error);
            }
            pluginHandleRef.current = null;
          }
          
          // Janus 세션 종료
          janusRef.current.destroy();
          janusRef.current = null;
          
          // 상태 초기화
          if (userIdToFeedIdRef.current) {
            userIdToFeedIdRef.current = {};
          }
          setIsJanusConnected(false);
          setRemoteStreams({});
          
          console.log('✅ Janus 정리 완료');
        } catch (error) {
          console.error('❌ Janus 정리 실패:', error);
        }
      }
      
      // 2. 웹캠 정리
      if (isWebcamOn && stopWebcam) {
        try {
          stopWebcam();
          console.log('✅ 웹캠 정리 완료');
        } catch (error) {
          console.error('❌ 웹캠 정리 실패:', error);
        }
      }
      
      // 3. WebSocket 연결 해제
      // ⭐⭐⭐ 핵심: disconnect()만 호출하면 끝!
      // 백엔드가 DISCONNECT 이벤트를 자동 감지하여:
      // - GameRoomLeaveService.leaveCurrentRoomByUser() 자동 실행
      // - 참가자 정보 DB 삭제
      // - 방 참가자 수 감소
      // - 게임 중이면 캐시 정리
      // - 방장이면 방 종료 및 남은 참가자 세션 정리
      // - PARTICIPANT_LEFT 또는 ROOM_CLOSED 이벤트 브로드캐스트
      // 모든 것이 자동으로 처리됩니다!
      try {
        websocketService.disconnect();
        console.log('✅ WebSocket 연결 해제 완료 (백엔드가 자동으로 퇴장 처리)');
      } catch (error) {
        console.error('❌ WebSocket 해제 실패:', error);
      }
      
      // 4. 페이지 이동 (navigateTo가 있을 때만)
      if (navigateTo) {
        navigate(navigateTo);
      }
      
    } catch (error) {
      console.error('❌ 방 나가기 실패:', error);
      // 실패 시에도 강제 이동 (navigateTo가 있을 때만)
      if (navigateTo) {
        navigate(navigateTo);
      }
    }
  }, [
    janusRef,
    pluginHandleRef,
    remoteFeedsRef,
    userIdToFeedIdRef,
    setRemoteStreams,
    setIsJanusConnected,
    stopWebcam,
    isWebcamOn,
    navigate,
    navigateTo,
    onBeforeExit,
  ]);
  
  return { cleanupAndExit };
};
