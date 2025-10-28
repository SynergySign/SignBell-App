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
import websocketService from '../../services/websocket/websocketService';
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
    showErrorAlert,
    errorMessage,
    allReady,
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
    setParticipants,
    showError,
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
  const isNavigatingToGameRef = useRef(false);

  // WebSocket 이벤트 핸들러
  const handleRoomJoin = useCallback((data) => {
    console.log('📥 방 입장 응답:', data);

    if (data.success) {
      const roomData = data.data;

      if (!myUserId) {
        console.error('❌ myUserId가 없습니다.');
        showError('사용자 정보를 불러오는데 실패했습니다.');
        return;
      }

      setInitialParticipants(roomData.participants, myUserId, isWebcamOn);
      updateRoomInfo(roomData);
    }
  }, [myUserId, isWebcamOn, setInitialParticipants, updateRoomInfo, showError]);

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

      case 'PARTICIPANT_LEFT': {
        const leftUserId = eventData.participant.userId;
        console.log('👋 참가자 퇴장:', eventData.participant);

        if (eventData.roomClosed) {
          console.log('🚪 방장이 나가 방이 종료됨');
          setShowRoomClosedAlert(true);
          return;
        }

        // Janus feed 정리
        const feedId = userIdToFeedIdRef.current[leftUserId];
        if (feedId && remoteFeedsRef.current[feedId]) {
          console.log(`🧹 Janus feed 정리: userId=${leftUserId}, feedId=${feedId}`);
          try {
            remoteFeedsRef.current[feedId].detach();
            delete remoteFeedsRef.current[feedId];
          } catch (error) {
            console.error('❌ Janus feed detach 실패:', error);
          }
        }

        // UserID to FeedID 매핑 제거
        if (userIdToFeedIdRef.current[leftUserId]) {
          delete userIdToFeedIdRef.current[leftUserId];
        }

        // Remote stream 제거
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[leftUserId];
          return newStreams;
        });

        // 참가자 목록에서 제거
        removeParticipant(leftUserId);
        break;
      }

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
      console.log('🔍 roomInfo 확인:', roomInfo);
      console.log('🔍 roomInfo.gameTitle:', roomInfo?.gameTitle);

      isNavigatingToGameRef.current = true;

      const participantsToPass = gameData?.participants || participants;
      const myUserIdToPass = gameData?.myUserId || myUserId;

      const stateToPass = {
        totalQuestions: gameData?.totalQuestions || 8,
        firstQuestion: gameData?.questionNumber || 1,
        firstWord: gameData?.wordTitle || '문제',
        participants: participantsToPass,
        myUserId: myUserIdToPass,
        roomTitle: roomInfo?.gameTitle || '방 제목'
      };

      console.log('📦 전달할 state:', stateToPass);

      navigate(`/quiz/game/${roomId}`, { state: stateToPass });
    } else {
      console.error('❌ 게임 시작 실패:', data.message);
      showError(data.message || '게임 시작에 실패했습니다.');
    }
  }, [participants, myUserId, roomId, navigate, showError]);

  const handleRoomClosed = useCallback(() => {
    setShowRoomClosedAlert(true);
  }, [setShowRoomClosedAlert]);

  // 퇴장 훅 (handleError에서 사용하므로 먼저 정의)
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

  // 연결만 정리하는 함수 (페이지 이동 없음)
  const cleanupOnly = useCallback(async () => {
    try {
      console.log('🧹 연결 정리 시작 (페이지 이동 없음)');

      // Janus WebRTC 정리
      if (janusRef.current) {
        try {
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

          if (pluginHandleRef.current) {
            pluginHandleRef.current.detach();
            pluginHandleRef.current = null;
          }

          janusRef.current.destroy();
          janusRef.current = null;
        } catch (error) {
          console.error('❌ Janus 정리 실패:', error);
        }
      }

      // 상태 초기화
      if (userIdToFeedIdRef.current) {
        userIdToFeedIdRef.current = {};
      }
      setRemoteStreams({});
      setIsJanusConnected(false);

      // 웹캠 정리
      if (isWebcamOn) {
        stopWebcam();
      }

      // WebSocket 연결 해제
      try {
        websocketService.disconnect();
        console.log('✅ WebSocket 연결 해제 완료');
      } catch (error) {
        console.error('❌ WebSocket 해제 실패:', error);
      }

      console.log('✅ 연결 정리 완료');
    } catch (error) {
      console.error('❌ 연결 정리 실패:', error);
    }
  }, [janusRef, pluginHandleRef, remoteFeedsRef, userIdToFeedIdRef, setRemoteStreams, setIsJanusConnected, isWebcamOn, stopWebcam]);

  const handleError = useCallback((data) => {
    console.error('📥 에러:', data);

    // 게임 페이지로 이동 중이면 에러 무시
    if (isNavigatingToGameRef.current) {
      console.log('⏭️ 게임 페이지로 이동 중이므로 에러 무시');
      return;
    }

    // 이미 종료된 방 에러 처리
    if (data.error === 'ROOM_ALREADY_FINISHED' || (data.message && data.message.includes('이미 종료된 방'))) {
      console.warn('⚠️ 이미 종료된 방입니다.');

      // WebSocket 연결만 정리 (페이지 이동은 모달 닫을 때)
      cleanupOnly();

      showError('이 방은 이미 종료되었습니다.\n새로운 방을 만들어주세요.');
      return;
    }

    // 이미 시작된 방 에러 처리
    if (data.error === 'ROOM_ALREADY_STARTED' || (data.message && data.message.includes('이미 시작된 방'))) {
      console.warn('⚠️ 이미 시작된 방입니다.');

      // WebSocket 연결만 정리 (페이지 이동은 모달 닫을 때)
      cleanupOnly();

      showError('이 방은 이미 게임이 시작되었습니다.\n새로운 방을 만들어주세요.');
      return;
    }

    // 기타 에러 처리
    showError(data.message || data.detail || '오류가 발생했습니다.');
  }, [showError, cleanupOnly, isNavigatingToGameRef]);

  // WebSocket 연결
  const { sendReady, sendStartGame } = useWaitingRoomWebSocket({
    roomId,
    myUserId,
    isAuthenticated,
    hasCheckedAuth,
    isWebcamOn,
    isNavigatingToGameRef,
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
      showError('로그인이 필요합니다.');
    }
  }, [hasCheckedAuth, isAuthenticated, myUserId, showError]);

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

      // 🔥 프론트엔드 상태: 방장 제외한 모든 참가자의 레디 상태 해제
      setParticipants(prev => prev.map(p => ({
        ...p,
        isReady: p.isHost ? p.isReady : false  // 방장은 유지, 나머지는 레디 해제
      })));

      // 🔥 백엔드 서버에 방 복귀 요청 (방장이면 모든 참가자 레디 초기화)
      const me = participants.find(p => p.userId === myUserId);
      const isHost = me?.isHost || false;

      if (isHost) {
        // 방장: returnToRoom API 호출 (백엔드에서 모든 참가자 레디 초기화)
        console.log('🎯 방장 복귀 - 서버에 방 복귀 요청 전송 (모든 참가자 레디 초기화)');
        websocketService.returnToRoom(Number(roomId));
      } else {
        // 일반 참가자: 자신의 레디만 false로 전송
        if (sendReady) {
          sendReady(false);
          console.log('✅ 일반 참가자 - 서버에 레디 상태 false 전송 완료');
        }
      }

      console.log('✅ 게임 복귀 처리 완료 - 레디 상태 초기화됨');

      // location.state 초기화
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setRemoteStreams, setIsJanusConnected, remoteFeedsRef, userIdToFeedIdRef, setParticipants, sendReady, myUserId, roomId]);

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
      showError('웹캠 권한이 거부되었습니다.\n브라우저 설정에서 웹캠 권한을 허용해주세요.');
    }
  }, [startWebcam, showError]);

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

  // 에러 모달 닫기 (특정 에러는 메인으로 이동)
  const handleErrorAlertClose = useCallback(() => {
    console.log('🔔 에러 모달 닫기 호출됨');
    console.log('📝 에러 메시지:', errorMessage);

    setShowErrorAlert(false);

    // 로그인 필요, 사용자 정보 로드 실패, 방 종료/시작 등의 경우 메인으로 이동
    if (
      errorMessage.includes('로그인이 필요합니다') ||
      errorMessage.includes('사용자 정보를 불러오는데 실패했습니다') ||
      errorMessage.includes('이미 종료되었습니다') ||
      errorMessage.includes('이미 게임이 시작되었습니다')
    ) {
      console.log('✅ 메인 페이지로 이동');
      navigate('/main');
    } else {
      console.log('⏭️ 현재 페이지 유지');
    }
  }, [setShowErrorAlert, errorMessage, navigate]);

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

        {/*  <WaitingRoomDebugPanel
          isJanusConnected={isJanusConnected}
          remoteStreamsCount={Object.keys(remoteStreams).length}
          isWebcamOn={isWebcamOn}
          isHost={isHost}
          onToggleHost={handleToggleHost}
          onToggleReady={handleReadyToggle}
          onNavigateToGame={handleNavigateToGame}
        /> */}
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

      {/* 에러 알림 모달 */}
      <AlertModal
        isOpen={showErrorAlert}
        onClose={handleErrorAlertClose}
        title="알림"
        message={errorMessage}
        type="error"
      />
    </div>
  );
};

export default QuizWaitingRoom;