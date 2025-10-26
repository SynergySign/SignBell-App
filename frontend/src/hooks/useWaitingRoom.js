/**
 * @개요 퀴즈 대기방 상태 관리 훅
 * @작성자 강관주 (Kanggwanju)
 * @작성일 2025-10-26
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

  // 참가자 목록
  const [participants, setParticipants] = useState([]);

  // 모달 상태
  const [showExitModal, setShowExitModal] = useState(false);
  const [showRoomClosedAlert, setShowRoomClosedAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
  const addParticipant = useCallback((participant, myUserId, isWebcamOn) => {
    setParticipants(prev => {
      if (prev.some(p => p.userId === participant.userId)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: participant.userId,
          userId: participant.userId,
          nickname: participant.nickname,
          profileImageUrl: participant.profileImageUrl,
          score: 0,
          isMe: participant.userId === myUserId,
          isHost: participant.host,
          isReady: participant.ready,
          webcamStatus: participant.userId === myUserId ? (isWebcamOn ? 'on' : 'off') : 'off'
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

  // 내 웹캠 상태 업데이트
  const updateMyWebcamStatus = useCallback((myUserId, isWebcamOn, webcamError) => {
    setParticipants(prev =>
      prev.map(p =>
        p.userId === myUserId
          ? {
            ...p,
            webcamStatus: isWebcamOn ? 'on' : webcamError ? 'denied' : 'off'
          }
          : p
      )
    );
  }, []);

  // 초기 참가자 설정
  const setInitialParticipants = useCallback((participantsList, myUserId, isWebcamOn) => {
    const formattedParticipants = participantsList.map(p => ({
      id: p.userId,
      userId: p.userId,
      nickname: p.nickname,
      profileImageUrl: p.profileImageUrl,
      score: 0,
      isMe: p.userId === myUserId,
      isHost: p.host,
      isReady: p.ready,
      webcamStatus: p.userId === myUserId ? (isWebcamOn ? 'on' : 'off') : 'off'
    }));
    setParticipants(formattedParticipants);
  }, []);

  // 에러 표시
  const showError = useCallback((message) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
  }, []);

  return {
    roomInfo,
    participants,
    showExitModal,
    showRoomClosedAlert,
    showErrorAlert,
    errorMessage,
    allReady,
    setRoomInfo,
    setParticipants,
    setShowExitModal,
    setShowRoomClosedAlert,
    setShowErrorAlert,
    setAllReady,
    updateRoomInfo,
    addParticipant,
    removeParticipant,
    updateParticipantReady,
    updateMyWebcamStatus,
    setInitialParticipants,
    showError,
  };
};
