/**
 * @개요 퀴즈 대기방 페이지 컴포넌트 (리팩토링)
 * @작성자 신동준 (sdj3959), 강관주 (리팩토링)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-24
 * @반환값 {JSX.Element} 퀴즈 대기방 페이지 컴포넌트
 */

import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebcamStore } from '../../store/webcam/webcamStore';
import { useAuthStore } from '../../store/auth/authStore';
import { useWaitingRoom } from '../../hooks/useWaitingRoom';
import { useWaitingRoomWebSocket } from '../../hooks/useWaitingRoomWebSocket';
import { useWaitingRoomJanus } from '../../hooks/useWaitingRoomJanus';
import WaitingRoomHeader from '../../components/waiting/WaitingRoomHeader';
import WaitingRoomWebcamControl from '../../components/waiting/WaitingRoomWebcamControl';
import WaitingRoomActionButton from '../../components/waiting/WaitingRoomActionButton';
import WaitingRoomParticipantsGrid from '../../components/waiting/WaitingRoomParticipantsGrid';
import WaitingRoomModals from '../../components/waiting/WaitingRoomModals';
import websocketService from '../../services/websocket/websocketService.js';
import styles from './QuizWaitingRoom.module.scss';

const QuizWaitingRoom = () => {
  console.log('🚪 QuizWaitingRoom 렌더링');

  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, hasCheckedAuth } = useAuthStore();
  const myUserId = user?.userId;

  // 웹캠 스토어
  const stream = useWebcamStore(state => state.stream);
  const isWebcamOn = useWebcamStore(state => state.isWebcamOn);
  const webcamError = useWebcamStore(state => state.error);
  const startWebcam = useWebcamStore(state => state.startWebcam);
  const stopWebcam = useWebcamStore(state => state.stopWebcam);

  // 로컬 비디오 ref
  const videoRef = useRef(null);
  const remoteVideosRef = useRef({});

  // 대기방 상태 (커스텀 훅)
  const waitingRoomState = useWaitingRoom();
  const {
    roomInfo,
    participants,
    showExitModal,
    showRoomClosedAlert,
    allReady,
    setShowExitModal,
    setShowRoomClosedAlert,
    setAllReady,
    setParticipants,
    updateRoomInfo,
    addParticipant,
    removeParticipant,
    updateParticipantReady,
    updateParticipantWebcam,
  } = waitingRoomState;

  // ============================================
  // WebSocket 이벤트 핸들러
  // ============================================
  const handleRoomJoin = useCallback((data) => {
    console.log('📥 방 입장 응답:', data);

    if (data.success) {
      const roomData = data.data;

      if (!myUserId) {
        console.error('❌ myUserId가 없습니다. useAuthStore를 확인하세요.');
        alert('사용자 정보를 불러오는데 실패했습니다.');
        navigate('/main');
        return;
      }

      const formattedParticipants = roomData.participants.map(p => ({
        id: p.userId,
        userId: p.userId,
        nickname: p.nickname,
        profileImageUrl: p.profileImageUrl,
        score: 0,
        isMe: p.userId === myUserId,
        isHost: p.host,
        isReady: p.ready,
        webcamStatus: 'off'
      }));

      console.log('✅ formattedParticipants:', formattedParticipants);
      setParticipants(formattedParticipants);
      updateRoomInfo(roomData);
      console.log('✅ State 업데이트 완료');
    }
  }, [myUserId, navigate, setParticipants, updateRoomInfo]);

  const handleParticipantEvent = useCallback((data) => {
    console.log('📥 참가자 이벤트:', data);

    if (!data.success) return;

    const eventData = data.data;

    switch (eventData.eventType) {
      case 'PARTICIPANT_JOINED': {
        const newUser = eventData.participant;
        console.log('🚪 새 참가자 입장:', newUser);
        addParticipant(newUser, myUserId);
        waitingRoomState.setRoomInfo(prev => ({
          ...prev,
          currentParticipants: eventData.currentParticipants
        }));
        break;
      }

      case 'PARTICIPANT_LEFT':
        console.log('👋 참가자 퇴장:', eventData.participant);
        if (eventData.roomClosed) {
          console.log('🚪 방장이 나가 방이 종료됨');
          setShowRoomClosedAlert(true);
          return;
        }
        removeParticipant(eventData.participant.userId);
        waitingRoomState.setRoomInfo(prev => ({
          ...prev,
          currentParticipants: eventData.currentParticipants
        }));
        break;

      case 'PARTICIPANT_READY_UPDATED': {
        console.log('✅ 준비 상태 변경:', eventData);
        const updatedReady =
          eventData.isReady !== undefined
            ? eventData.isReady
            : eventData.ready !== undefined
              ? eventData.ready
              : false;
        updateParticipantReady(eventData.userId, updatedReady);
        break;
      }

      case 'ROOM_CLOSED':
        console.log('🚪 방 종료 (이벤트 수신):', eventData);
        setShowRoomClosedAlert(true);
        break;

      default:
        console.log('알 수 없는 이벤트:', eventData.eventType);
    }
  }, [myUserId, addParticipant, removeParticipant, updateParticipantReady, setShowRoomClosedAlert, waitingRoomState]);

  const handleRoomClosed = useCallback((data) => {
    console.log('📥 방 종료 알림:', data);
    setShowRoomClosedAlert(true);
  }, [setShowRoomClosedAlert]);

  const handleError = useCallback((data) => {
    console.error('📥 에러:', data);

    if (data.error === 'ROOM_ALREADY_STARTED' || (data.message && data.message.includes('이미 시작된 방'))) {
      if (wsHooks.isNavigatingToGameRef.current) {
        console.log('⏭️ 게임 페이지로 이동 중이므로 에러 무시');
        return;
      }
      console.warn('⚠️ 이미 시작된 방입니다.');
      alert('이 방은 이미 게임이 시작되었습니다.\n새로운 방을 만들어주세요.');
      navigate('/main');
      return;
    }

    alert(data.message || data.detail || '오류가 발생했습니다.');
  }, [navigate]);

  const handleGameStart = useCallback((data) => {
    console.log('📥📥📥 게임 시작 응답 RAW:', JSON.stringify(data, null, 2));

    if (data.success) {
      const gameData = data.data;
      console.log('✅ 게임 시작 - 게임 페이지로 이동');

      wsHooks.isNavigatingToGameRef.current = true;

      const participantsToPass = gameData?.participants || participants;
      const myUserIdToPass = gameData?.myUserId || myUserId;

      const stateToPass = {
        totalQuestions: gameData?.totalQuestions || 8,
        firstQuestion: gameData?.questionNumber || 1,
        firstWord: gameData?.wordTitle || '문제',
        participants: participantsToPass,
        myUserId: myUserIdToPass
      };

      console.log('전달할 state:', JSON.stringify(stateToPass, null, 2));
      navigate(`/quiz/game/${roomId}`, { state: stateToPass });
    } else {
      console.error('❌ 게임 시작 실패:', data.message);
      alert(data.message || '게임 시작에 실패했습니다.');
    }
  }, [participants, myUserId, roomId, navigate]);

  // WebSocket 훅
  const wsHooks = useWaitingRoomWebSocket({
    roomId,
    myUserId,
    isAuthenticated,
    hasCheckedAuth,
    waitingRoomState,
    onRoomJoin: handleRoomJoin,
    onParticipantEvent: handleParticipantEvent,
    onRoomClosed: handleRoomClosed,
    onGameStart: handleGameStart,
    onError: handleError,
  });

  // Janus WebRTC 훅
  const { remoteStreams, isJanusConnected } = useWaitingRoomJanus({
    roomId,
    myUserId,
    participants,
    isWebcamOn,
    stream,
    isNavigatingToGameRef: wsHooks.isNavigatingToGameRef,
  });

  // ============================================
  // 인증 체크
  // ============================================
  useEffect(() => {
    if (!hasCheckedAuth) {
      console.log('⏳ 인증 상태 확인 중...');
      return;
    }

    if (!isAuthenticated || !myUserId) {
      alert('로그인이 필요합니다.');
      navigate('/main');
    } else {
      console.log('✅ 인증 확인:', myUserId);
    }
  }, [hasCheckedAuth, isAuthenticated, myUserId, navigate]);

  // ============================================
  // 웹캠 스트림 연결
  // ============================================
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // 원격 스트림 연결
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([userId, remoteStream]) => {
      const videoElement = remoteVideosRef.current[userId];
      if (videoElement && videoElement.srcObject !== remoteStream) {
        videoElement.srcObject = remoteStream;
        console.log('📺 비디오 엘리먼트에 스트림 연결, User ID:', userId);
      }
    });
  }, [remoteStreams]);

  // 웹캠 상태 변경 시 참가자 정보 업데이트
  useEffect(() => {
    updateParticipantWebcam(myUserId, isWebcamOn, webcamError);
  }, [isWebcamOn, webcamError, myUserId, updateParticipantWebcam]);

  // 준비 상태 계산
  useEffect(() => {
    const nonHostParticipants = participants.filter(p => !p.isHost);
    const allNonHostReady = nonHostParticipants.length > 0 &&
      nonHostParticipants.every(p => p.isReady);

    console.log('🔍 준비 상태 체크:', {
      nonHostCount: nonHostParticipants.length,
      allReady: allNonHostReady,
    });

    setAllReady(allNonHostReady);
  }, [participants, setAllReady]);

  // ============================================
  // 이벤트 핸들러
  // ============================================
  const handleWebcamToggle = useCallback(async () => {
    try {
      if (isWebcamOn) {
        stopWebcam();
      } else {
        await startWebcam();
      }
    } catch (error) {
      console.error('웹캠 권한 거부:', error);
    }
  }, [isWebcamOn, startWebcam, stopWebcam]);

  const handleAction = useCallback(() => {
    const me = participants.find(p => p.userId === myUserId);
    const isHost = me?.isHost || false;

    if (isHost) {
      if (allReady) {
        wsHooks.startGame();
      }
    } else {
      const isReady = me?.isReady || false;
      const toggledReady = wsHooks.toggleReady(isReady);
      setParticipants(prev =>
        prev.map(p =>
          p.userId === myUserId ? { ...p, isReady: toggledReady } : p
        )
      );
    }
  }, [participants, myUserId, allReady, wsHooks, setParticipants]);

  const cleanupAndExit = useCallback(async () => {
    try {
      console.log('🚪 방 나가기 처리 시작');

      // 1. Janus WebRTC 정리
      // (useWaitingRoomJanus 훅의 cleanup에서 자동 처리)

      // 2. 웹캠 정리
      if (isWebcamOn) {
        stopWebcam();
        console.log('✅ 웹캠 정리 완료');
      }

      // 3. WebSocket 연결 해제
      websocketService.disconnect();
      console.log('✅ WebSocket 연결 해제 완료');

      // 4. 메인 페이지로 이동
      navigate('/main');
    } catch (error) {
      console.error('❌ 방 나가기 실패:', error);
      navigate('/main');
    }
  }, [isWebcamOn, stopWebcam, navigate]);

  const handleExit = useCallback(() => {
    setShowExitModal(true);
  }, [setShowExitModal]);

  const confirmExit = useCallback(() => {
    cleanupAndExit();
  }, [cleanupAndExit]);

  const handleRoomClosedAlertClose = useCallback(() => {
    cleanupAndExit();
  }, [cleanupAndExit]);

  // ============================================
  // 렌더링
  // ============================================
  const me = participants.find(p => p.userId === myUserId);
  const isHost = me?.isHost || false;
  const isReady = me?.isReady || false;

  return (
    <div className={styles.quizWaitingRoom}>
      {/* 방 정보 헤더 */}
      <WaitingRoomHeader
        roomInfo={roomInfo}
        roomId={roomId}
        onExit={handleExit}
      />

      {/* 메인 콘텐츠 */}
      <main className={styles.waitingContent}>
        {/* 웹캠 제어 */}
        <WaitingRoomWebcamControl
          isWebcamOn={isWebcamOn}
          webcamError={webcamError}
          onToggle={handleWebcamToggle}
        />

        {/* 준비/시작 버튼 */}
        <WaitingRoomActionButton
          isHost={isHost}
          isReady={isReady}
          allReady={allReady}
          isWebcamOn={isWebcamOn}
          onAction={handleAction}
        />

        {/* 참가자 그리드 */}
        <WaitingRoomParticipantsGrid
          participants={participants}
          myUserId={myUserId}
          isWebcamOn={isWebcamOn}
          videoRef={videoRef}
          remoteStreams={remoteStreams}
          remoteVideosRef={remoteVideosRef}
        />

        {/* 테스트 버튼들 */}
        <div className={styles.testButtons}>
          <div className={styles.janusStatus}>
            <span>Janus: {isJanusConnected ? '✅ 연결됨' : '❌ 연결 안됨'}</span>
            <span>원격 스트림: {Object.keys(remoteStreams).length}개</span>
            <span>웹캠: {isWebcamOn ? '✅ ON' : '❌ OFF'}</span>
          </div>
          <button
            className={styles.testButton}
            onClick={() => {
              setParticipants(prev => prev.map(p =>
                p.userId === myUserId
                  ? { ...p, isHost: !p.isHost }
                  : p
              ));
            }}
          >
            {isHost ? '참여자로 전환' : '방장으로 전환'}
          </button>
          <button
            className={styles.testButton}
            onClick={() => {
              const toggledReady = wsHooks.toggleReady(isReady);
              setParticipants(prev =>
                prev.map(p =>
                  p.userId === myUserId ? { ...p, isReady: toggledReady } : p
                )
              );
            }}
          >
            준비 상태 토글
          </button>
          <button
            className={styles.testButton}
            onClick={() => navigate(`/quiz/game/${roomId}`)}
          >
            게임 시작 (테스트)
          </button>
        </div>
      </main>

      {/* 모달들 */}
      <WaitingRoomModals
        showExitModal={showExitModal}
        showRoomClosedAlert={showRoomClosedAlert}
        onCancelExit={() => setShowExitModal(false)}
        onConfirmExit={confirmExit}
        onRoomClosedAlertClose={handleRoomClosedAlertClose}
      />
    </div>
  );
};

export default QuizWaitingRoom;
