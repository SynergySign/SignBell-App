/**
 * @개요 퀴즈 대기방 페이지 컴포넌트 (리팩토링)
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-26 (리팩토링)
 * @반환값 {JSX.Element} 퀴즈 대기방 페이지 컴포넌트
 */

import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWebcamStore } from '../../store/webcam/webcamStore';
import { useJanus } from '../../contexts/JanusContext';
import { useAuthStore } from '../../store/auth/authStore';
import { useRoomExit } from '../../hooks/useRoomExit';
import { useWaitingRoom } from '../../hooks/useWaitingRoom';
import { useWaitingRoomWebSocket } from '../../hooks/useWaitingRoomWebSocket';
import { useWaitingRoomJanus } from '../../hooks/useWaitingRoomJanus';
import WaitingRoomHeader from '../../components/quiz/WaitingRoomHeader';
import WaitingRoomWebcamControl from '../../components/quiz/WaitingRoomWebcamControl';
import WaitingRoomActionButton from '../../components/quiz/WaitingRoomActionButton';
import WaitingRoomParticipantsGrid from '../../components/quiz/WaitingRoomParticipantsGrid';
import WaitingRoomDebugPanel from '../../components/quiz/WaitingRoomDebugPanel';
import WaitingRoomExitModal from '../../components/quiz/WaitingRoomExitModal';
import AlertModal from '../../components/ui/AlertModal';
import styles from './QuizWaitingRoom.module.scss';

const QuizWaitingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 인증 정보
  const { user, isAuthenticated, hasCheckedAuth } = useAuthStore();
  const myUserId = user?.userId;

  // 대기방 상태 관리
  const {
    roomInfo,
    participants,
    showExitModal,
    showRoomClosedAlert,
    allReady,
    setShowExitModal,
    setShowRoomClosedAlert,
    setAllReady,
    updateRoomInfo,
    addParticipant,
    removeParticipant,
    updateParticipantReady,
    updateMyWebcamStatus,
    setInitialParticipants,
    setParticipants,
  } = useWaitingRoom();

  // 웹캠 관리
  const stream = useWebcamStore(state => state.stream);
  const isWebcamOn = useWebcamStore(state => state.isWebcamOn);
  const webcamError = useWebcamStore(state => state.error);
  const startWebcam = useWebcamStore(state => state.startWebcam);
  const stopWebcam = useWebcamStore(state => state.stopWebcam);

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

  // Refs
  const videoRef = useRef(null);

  // WebSocket 이벤트 핸들러
  const handleRoomJoin = useCallback((data) => {
    console.log('📥 방 입장 응답:', data);

    if (data.success) {
      const roomData = data.data;

      if (!myUserId) {
        console.error('❌ myUserId가 없습니다.');
        alert('사용자 정보를 불러오는데 실패했습니다.');
        navigate('/main');
        return;
      }

      setInitialParticipants(roomData.participants, myUserId, isWebcamOn);
      updateRoomInfo(roomData);
    }
  }, [myUserId, isWebcamOn, navigate, setInitialParticipants, updateRoomInfo]);

  const handleParticipantEvent = useCallback((data) => {
    console.log('📥 참가자 이벤트:', data);

    if (!data.success) return;

    const eventData = data.data;

    switch (eventData.eventType) {
      case 'PARTICIPANT_JOINED': {
        const newUser = eventData.participant;
        console.log('🚪 새 참가자 입장:', newUser);
        addParticipant(newUser, myUserId, isWebcamOn);
        setParticipants(prev => {
          const updated = [...prev];
          return updated;
        });
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
        break;

      case 'PARTICIPANT_READY_UPDATED': {
        console.log('✅ 준비 상태 변경:', eventData);
        const updatedReady = eventData.isReady ?? eventData.ready ?? false;
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
  }, [myUserId, isWebcamOn, addParticipant, removeParticipant, updateParticipantReady, setShowRoomClosedAlert, setParticipants]);

  const handleGameStart = useCallback((data) => {
    console.log('📥 게임 시작 응답:', data);

    if (data.success) {
      const gameData = data.data;
      console.log('✅ 게임 시작 - 게임 페이지로 이동');

      isNavigatingToGameRef.current = true;

      const participantsToPass = gameData?.participants || participants;
      const myUserIdToPass = gameData?.myUserId || myUserId;

      const stateToPass = {
        totalQuestions: gameData?.totalQuestions || 8,
        firstQuestion: gameData?.questionNumber || 1,
        firstWord: gameData?.wordTitle || '문제',
        participants: participantsToPass,
        myUserId: myUserIdToPass
      };

      navigate(`/quiz/game/${roomId}`, { state: stateToPass });
    } else {
      console.error('❌ 게임 시작 실패:', data.message);
      alert(data.message || '게임 시작에 실패했습니다.');
    }
  }, [participants, myUserId, roomId, navigate]);

  const handleRoomClosed = useCallback(() => {
    setShowRoomClosedAlert(true);
  }, [setShowRoomClosedAlert]);

  const handleError = useCallback((data) => {
    console.error('📥 에러:', data);

    if (data.error === 'ROOM_ALREADY_STARTED' || (data.message && data.message.includes('이미 시작된 방'))) {
      if (isNavigatingToGameRef.current) {
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

  // WebSocket 연결
  const { sendReady, sendStartGame, isNavigatingToGameRef } = useWaitingRoomWebSocket({
    roomId,
    myUserId,
    isAuthenticated,
    hasCheckedAuth,
    isWebcamOn,
    onRoomJoin: handleRoomJoin,
    onParticipantEvent: handleParticipantEvent,
    onGameStart: handleGameStart,
    onRoomClosed: handleRoomClosed,
    onError: handleError,
  });

  // Janus WebRTC 연결
  useWaitingRoomJanus({
    roomId,
    myUserId,
    participants,
    isWebcamOn,
    stream,
    janusRef,
    pluginHandleRef,
    remoteFeedsRef,
    userIdToFeedIdRef,
    isJanusConnected,
    setIsJanusConnected,
    setRemoteStreams,
    isNavigatingToGameRef,
  });

  // 인증 체크
  useEffect(() => {
    if (!hasCheckedAuth) {
      console.log('⏳ 인증 상태 확인 중...');
      return;
    }

    if (!isAuthenticated || !myUserId) {
      alert('로그인이 필요합니다.');
      navigate('/main');
    }
  }, [hasCheckedAuth, isAuthenticated, myUserId, navigate]);

  // 게임에서 돌아올 때 처리
  useEffect(() => {
    if (location.state?.returnFromGame) {
      console.log('🔄 게임에서 복귀 감지');

      // Remote streams 강제 초기화
      setRemoteStreams({});

      // Remote feeds 정리
      if (remoteFeedsRef.current && Object.keys(remoteFeedsRef.current).length > 0) {
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

      // UserID to FeedID 매핑 초기화
      if (userIdToFeedIdRef.current) {
        userIdToFeedIdRef.current = {};
      }

      // Janus 연결 상태 초기화
      setIsJanusConnected(false);

      // location.state 초기화
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setRemoteStreams, setIsJanusConnected, remoteFeedsRef, userIdToFeedIdRef]);

  // 로컬 비디오 스트림 연결
  useEffect(() => {
    const connectVideo = () => {
      if (videoRef.current && stream) {
        console.log('📹 로컬 비디오 ref에 스트림 연결:', stream.id);
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.error('❌ 비디오 재생 실패:', err);
        });
      } else if (!videoRef.current && stream) {
        setTimeout(connectVideo, 100);
      }
    };

    connectVideo();
  }, [stream]);

  // 웹캠 상태 변경 시 내 정보 업데이트
  useEffect(() => {
    if (myUserId) {
      updateMyWebcamStatus(myUserId, isWebcamOn, webcamError);
    }
  }, [myUserId, isWebcamOn, webcamError, updateMyWebcamStatus]);

  // 참가자 준비 상태 변경 시 allReady 계산
  useEffect(() => {
    const nonHostParticipants = participants.filter(p => !p.isHost);
    const allNonHostReady = nonHostParticipants.length > 0 &&
      nonHostParticipants.every(p => p.isReady);

    setAllReady(allNonHostReady);
  }, [participants, setAllReady]);

  // 웹캠 권한 요청
  const handleWebcamRequest = useCallback(async () => {
    try {
      await startWebcam();
    } catch (error) {
      console.error('웹캠 권한 거부:', error);
    }
  }, [startWebcam]);

  // 웹캠 토글
  const handleWebcamToggle = useCallback(() => {
    if (isWebcamOn) {
      stopWebcam();
    } else {
      handleWebcamRequest();
    }
  }, [isWebcamOn, stopWebcam, handleWebcamRequest]);

  // 내 정보
  const me = participants.find(p => p.userId === myUserId);
  const isHost = me?.isHost || false;
  const isReady = me?.isReady || false;

  // 준비 상태 토글
  const handleReadyToggle = useCallback(() => {
    const toggledReady = !isReady;
    setParticipants((prevParticipants) =>
      prevParticipants.map((p) =>
        p.userId === myUserId ? { ...p, isReady: toggledReady } : p
      )
    );
    sendReady(toggledReady);
  }, [isReady, myUserId, setParticipants, sendReady]);

  // 게임 시작
  const handleStartGame = useCallback(() => {
    sendStartGame();
  }, [sendStartGame]);

  // 액션 버튼 핸들러
  const handleAction = useCallback(() => {
    if (isHost) {
      handleStartGame();
    } else {
      handleReadyToggle();
    }
  }, [isHost, handleStartGame, handleReadyToggle]);

  // 퇴장 훅
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
  });

  // 나가기
  const handleExit = useCallback(() => {
    setShowExitModal(true);
  }, [setShowExitModal]);

  const confirmExit = useCallback(() => {
    cleanupAndExit();
  }, [cleanupAndExit]);

  const handleRoomClosedAlertClose = useCallback(() => {
    cleanupAndExit();
  }, [cleanupAndExit]);

  // 디버그 핸들러
  const handleToggleHost = useCallback(() => {
    setParticipants(prev => prev.map(p =>
      p.userId === myUserId ? { ...p, isHost: !p.isHost } : p
    ));
  }, [myUserId, setParticipants]);

  const handleNavigateToGame = useCallback(() => {
    navigate(`/quiz/game/${roomId}`);
  }, [navigate, roomId]);

  return (
    <div className={styles.quizWaitingRoom}>
      <WaitingRoomHeader
        roomId={roomInfo.gameRoomId || roomId}
        roomTitle={roomInfo.gameTitle}
        onExit={handleExit}
      />

      <main className={styles.waitingContent}>
        <WaitingRoomWebcamControl
          isWebcamOn={isWebcamOn}
          webcamError={webcamError}
          onToggle={handleWebcamToggle}
        />

        <WaitingRoomActionButton
          isHost={isHost}
          isReady={isReady}
          isWebcamOn={isWebcamOn}
          allReady={allReady}
          onAction={handleAction}
        />

        <WaitingRoomParticipantsGrid
          participants={participants}
          myUserId={myUserId}
          localVideoRef={videoRef}
          remoteStreams={remoteStreams}
          maxParticipants={roomInfo.maxParticipants}
        />

        <WaitingRoomDebugPanel
          isJanusConnected={isJanusConnected}
          remoteStreamsCount={Object.keys(remoteStreams).length}
          isWebcamOn={isWebcamOn}
          isHost={isHost}
          onToggleHost={handleToggleHost}
          onToggleReady={handleReadyToggle}
          onNavigateToGame={handleNavigateToGame}
        />
      </main>

      {/* 나가기 확인 모달 */}
      <WaitingRoomExitModal
        isOpen={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onConfirm={confirmExit}
      />

      {/* 방 종료 알림 모달 */}
      <AlertModal
        isOpen={showRoomClosedAlert}
        onClose={handleRoomClosedAlertClose}
        title="방 종료"
        message="방장이 나가서 방이 종료되었습니다."
        type="warning"
      />
    </div>
  );
};

export default QuizWaitingRoom;