/**
 * @개요 대기방 상태 관리 커스텀 훅
 * @작성자 강관주
 * @작성일 2025-10-24
 */

import { useState, useCallback } from 'react';

export const useWaitingRoom = () => {
  // 방 정보
  const [roomInfo, setRoomInfo] = useState({
    gameRoomId: null,
    gameTitle: '',
    hostId: null,
    maxParticipants: 4,
    currentParticipants: 0,
    status: 'WAITING'
  });

  // 참가자 데이터
  const [participants, setParticipants] = useState([]);

  // 모달 상태
  const [showExitModal, setShowExitModal] = useState(false);
  const [showRoomClosedAlert, setShowRoomClosedAlert] = useState(false);

  // 준비 상태
  const [allReady, setAllReady] = useState(false);

  // 방 정보 업데이트
  const updateRoomInfo = useCallback((data) => {
    setRoomInfo({
      gameRoomId: data.gameRoomId,
      gameTitle: data.gameTitle,
      hostId: data.hostId,
      maxParticipants: data.maxParticipants,
      currentParticipants: data.currentParticipants,
      status: data.status
    });
  }, []);

  // 참가자 추가
  const addParticipant = useCallback((newUser, myUserId) => {
    setParticipants(prev => {
      if (prev.some(p => p.userId === newUser.userId)) {
        console.log('⚠️ 이미 존재하는 참가자, 추가하지 않음:', newUser.userId);
        return prev;
      }
      return [
        ...prev,
        {
          id: newUser.userId,
          userId: newUser.userId,
          nickname: newUser.nickname,
          profileImageUrl: newUser.profileImageUrl,
          score: 0,
          isMe: newUser.userId === myUserId,
          isHost: newUser.host,
          isReady: newUser.ready,
          webcamStatus: 'off'
        }
      ];
    });
  }, []);

  // 참가자 제거
  const removeParticipant = useCallback((userId) => {
    setParticipants(prev => prev.filter(p => p.userId !== userId));
  }, []);

  // 참가자 준비 상태 업데이트
  const updateParticipantReady = useCallback((userId, isReady) => {
    setParticipants(prev =>
      prev.map(p =>
        p.userId === userId ? { ...p, isReady } : p
      )
    );
  }, []);

  // 참가자 웹캠 상태 업데이트
  const updateParticipantWebcam = useCallback((myUserId, isWebcamOn, webcamError) => {
    setParticipants(prev => prev.map(p =>
      p.isMe
        ? {
          ...p,
          webcamStatus: isWebcamOn ? 'on' : webcamError ? 'denied' : 'off'
        }
        : p
    ));
  }, []);

  return {
    roomInfo,
    participants,
    showExitModal,
    showRoomClosedAlert,
    allReady,
    setRoomInfo,
    setParticipants,
    setShowExitModal,
    setShowRoomClosedAlert,
    setAllReady,
    updateRoomInfo,
    addParticipant,
    removeParticipant,
    updateParticipantReady,
    updateParticipantWebcam,
  };
};
