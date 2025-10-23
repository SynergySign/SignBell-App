/**
 * @개요 퀴즈 대기방 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-23
 * @반환값 {JSX.Element} 퀴즈 대기방 페이지 컴포넌트
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useWebcam from '../../hooks/useWebcam';
import styles from './QuizWaitingRoom.module.scss';
import websocketService from '../../services/websocket/websocketService.js';

const QuizWaitingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [allReady, setAllReady] = useState(false);

  // 웹캠 관리
  const {
    stream,
    isWebcamOn,
    error: webcamError,
    videoRef,
    startWebcam,
    stopWebcam,
    toggleWebcam
  } = useWebcam();

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

  // ============================================
  // Janus WebRTC 관리
  // ============================================
  const remoteVideosRef = useRef({}); // { userId: videoElement }
  const [remoteStreams, setRemoteStreams] = useState({}); // { userId: stream }
  const janusRef = useRef(null);
  const pluginHandleRef = useRef(null);
  const remoteFeedsRef = useRef({}); // { feedId: pluginHandle }
  const userIdToFeedIdRef = useRef({}); // { userId: feedId } 매핑
  const [isJanusConnected, setIsJanusConnected] = useState(false);

  // Janus 서버 URL
  const JANUS_SERVER = import.meta.env.VITE_JANUS_SERVER || 'https://janus.jsflux.co.kr/janus';

  // WebSocket 연결
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        websocketService.on('room:join', handleRoomJoin);
        websocketService.on('participant', handleParticipantEvent);
        websocketService.on('error', handleError);

        await websocketService.connect();
        console.log('✅ WebSocket 연결 성공!');

        setTimeout(() => {
          websocketService.joinRoom(Number(roomId));
          console.log(`🚪 방 ${roomId}에 입장 시도`);
        }, 300);

      } catch (error) {
        console.error('❌ WebSocket 연결 실패:', error);
        alert('연결 실패: ' + error.message);
      }
    };

    initWebSocket();

    return () => {
      websocketService.off('room:join', handleRoomJoin);
      websocketService.off('participant', handleParticipantEvent);
      websocketService.off('error', handleError);
    };
  }, [roomId]);

  // Janus WebRTC 연결 (방 입장 후 + 웹캠 켜진 후)
  useEffect(() => {
    // 방에 입장하지 않았으면 Janus 연결 안 함
    if (!myUserId || participants.length === 0) {
      console.log('⏳ 방 입장 대기 중... Janus 연결 보류');
      return;
    }

    // 웹캠이 켜지지 않았으면 Janus 연결 안 함
    if (!isWebcamOn || !stream) {
      console.log('⏳ 웹캠 대기 중... Janus 연결 보류');
      return;
    }

    // Janus가 로드되지 않았으면 연결 안 함
    if (!window.Janus) {
      console.error('❌ Janus 라이브러리가 로드되지 않았습니다.');
      return;
    }

    const Janus = window.Janus;

    console.log('🎥 Janus 연결 시작:', { roomId, myUserId });

    // Janus 초기화
    Janus.init({
      debug: 'all',
      callback: function () {
        console.log('✅ Janus 초기화 완료');

        // Janus 세션 생성
        janusRef.current = new Janus({
          server: JANUS_SERVER,
          success: function () {
            console.log('✅ Janus 서버 연결 성공');

            // VideoRoom 플러그인 attach
            janusRef.current.attach({
              plugin: 'janus.plugin.videoroom',
              opaqueId: `user-${myUserId}`,
              success: function (pluginHandle) {
                console.log('✅ VideoRoom 플러그인 연결 성공');
                pluginHandleRef.current = pluginHandle;

                // 방 참여 (publisher로)
                const register = {
                  request: 'join',
                  room: parseInt(roomId),
                  ptype: 'publisher',
                  display: String(myUserId),
                };

                pluginHandle.send({ message: register });
              },
              error: function (error) {
                console.error('❌ 플러그인 연결 실패:', error);
              },
              onmessage: function (msg, jsep) {
                console.log('📨 Janus 메시지 수신:', msg);
                const event = msg['videoroom'];

                if (event === 'joined') {
                  const myFeedId = msg['id'];
                  console.log('✅ Janus 방 참여 성공, My Feed ID:', myFeedId);
                  setIsJanusConnected(true);

                  // 내 스트림 publish
                  publishOwnFeed();

                  // 기존 참가자 구독
                  if (msg['publishers']) {
                    msg['publishers'].forEach((publisher) => {
                      console.log('📺 기존 참가자 발견:', publisher.display, 'Feed ID:', publisher.id);
                      const userId = parseInt(publisher.display);
                      userIdToFeedIdRef.current[userId] = publisher.id;
                      subscribeToFeed(publisher.id, userId);
                    });
                  }
                } else if (event === 'event') {
                  // 새 참가자 입장
                  if (msg['publishers']) {
                    msg['publishers'].forEach((publisher) => {
                      console.log('📺 새 참가자 입장:', publisher.display, 'Feed ID:', publisher.id);
                      const userId = parseInt(publisher.display);
                      userIdToFeedIdRef.current[userId] = publisher.id;
                      subscribeToFeed(publisher.id, userId);
                    });
                  }
                  // 참가자 퇴장
                  if (msg['leaving']) {
                    const leavingFeedId = msg['leaving'];
                    console.log('👋 Janus 참가자 퇴장, Feed ID:', leavingFeedId);

                    // feedId로 userId 찾기
                    let leavingUserId = null;
                    for (const [userId, feedId] of Object.entries(userIdToFeedIdRef.current)) {
                      if (feedId === leavingFeedId) {
                        leavingUserId = parseInt(userId);
                        break;
                      }
                    }

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

                // JSEP 처리
                if (jsep) {
                  pluginHandleRef.current.handleRemoteJsep({ jsep: jsep });
                }
              },
              onlocalstream: function (localStream) {
                console.log('✅ 로컬 스트림 수신 (Janus echo)');
                // useWebcam의 videoRef가 이미 스트림을 표시하고 있으므로 무시
              },
              onremotestream: function () {
                // Publisher는 sendonly이므로 원격 스트림 없음
              },
            });
          },
          error: function (error) {
            console.error('❌ Janus 서버 연결 실패:', error);
          },
          destroyed: function () {
            console.log('🔌 Janus 세션 종료');
          },
        });
      },
    });

    // 내 스트림 publish
    function publishOwnFeed() {
      console.log('📤 내 스트림 publish 시작');

      pluginHandleRef.current.createOffer({
        stream: stream, // useWebcam의 스트림 사용
        media: {
          audioRecv: false,
          videoRecv: false,
          audioSend: true,
          videoSend: true,
        },
        success: function (jsep) {
          console.log('✅ Offer 생성 성공');
          const publish = {
            request: 'configure',
            audio: true,
            video: true,
          };
          pluginHandleRef.current.send({ message: publish, jsep: jsep });
        },
        error: function (error) {
          console.error('❌ Offer 생성 실패:', error);
        },
      });
    }

    // 다른 참가자 구독
    function subscribeToFeed(feedId, userId) {
      let remoteFeed = null;

      console.log('📺 참가자 구독 시작:', { feedId, userId });

      janusRef.current.attach({
        plugin: 'janus.plugin.videoroom',
        opaqueId: `subscriber-${myUserId}-${feedId}`,
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
        onmessage: function (msg, jsep) {
          const event = msg['videoroom'];
          console.log('📨 Subscriber 메시지:', event, msg);

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
          console.log('✅ 원격 스트림 수신:', { feedId, userId });

          remoteFeedsRef.current[feedId] = remoteFeed;

          setRemoteStreams((prev) => ({
            ...prev,
            [userId]: remoteStream,
          }));
        },
      });
    }

    return () => {
      // 정리
      console.log('🧹 Janus 연결 정리');
      if (janusRef.current) {
        janusRef.current.destroy();
        janusRef.current = null;
      }
      pluginHandleRef.current = null;
      remoteFeedsRef.current = {};
      userIdToFeedIdRef.current = {};
      setIsJanusConnected(false);
    };
  }, [myUserId, participants.length, roomId, isWebcamOn, stream]);

  // 원격 스트림을 video 엘리먼트에 연결
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([userId, remoteStream]) => {
      const videoElement = remoteVideosRef.current[userId];
      if (videoElement && videoElement.srcObject !== remoteStream) {
        videoElement.srcObject = remoteStream;
        console.log('📺 비디오 엘리먼트에 스트림 연결, User ID:', userId);
      }
    });
  }, [remoteStreams]);

  // 핸들러 함수들
  const handleRoomJoin = (data) => {
    console.log('📥 방 입장 응답:', data);

    if (data.success) {
      const roomData = data.data;

      // TODO: 실제 로그인한 사용자 ID 가져오기
      // 임시로 마지막 참가자를 "나"로 설정 (방금 입장한 사람)
      const myId = roomData.participants[roomData.participants.length - 1].userId;
      setMyUserId(myId); // state에 저장

      // 참가자 목록 업데이트
      const formattedParticipants = roomData.participants.map(p => ({
        id: p.userId,
        userId: p.userId,
        nickname: p.nickname,
        profileImageUrl: p.profileImageUrl,
        score: 0, // TODO: 실제 점수는 나중에
        isMe: p.userId === myId, // 나인지 확인
        isHost: p.host,
        isReady: p.ready,
        webcamStatus: 'off'
      }));

      setParticipants(formattedParticipants);

      // 방 정보 업데이트
      setRoomInfo({
        gameRoomId: roomData.gameRoomId,
        gameTitle: roomData.gameTitle,
        hostId: roomData.hostId,
        maxParticipants: roomData.maxParticipants,
        currentParticipants: roomData.currentParticipants,
        status: roomData.status
      });

      console.log('✅ State 업데이트 완료');
    }
  };

  const handleParticipantEvent = (data) => {
    console.log('📥 참가자 이벤트:', data);

    if (!data.success) return;

    const eventData = data.data;

    switch (eventData.eventType) {
      case 'PARTICIPANT_JOINED': {
        const newUser = eventData.participant;
        console.log('🚪 새 참가자 입장:', newUser);

        setParticipants(prev => {
          // ✅ 중복 방지: 이미 존재하는 userId면 무시
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

        setRoomInfo(prev => ({
          ...prev,
          currentParticipants: eventData.currentParticipants
        }));
        break;
      }

      case 'PARTICIPANT_LEFT':
        console.log('👋 참가자 퇴장:', eventData.participant);
        if (eventData.roomClosed) {
          alert('방장이 나가서 방이 종료되었습니다.');
          websocketService.disconnect();
          navigate('/main');
          return;
        }
        setParticipants(prev =>
          prev.filter(p => p.userId !== eventData.participant.userId)
        );
        setRoomInfo(prev => ({
          ...prev,
          currentParticipants: eventData.currentParticipants
        }));
        break;

      case 'PARTICIPANT_READY_UPDATED':
        {
          console.log('✅ 준비 상태 변경:', eventData);

          const updatedReady =
            eventData.isReady !== undefined
              ? eventData.isReady
              : eventData.ready !== undefined
                ? eventData.ready
                : false;

          // 개별 참가자 업데이트
          setParticipants(prev =>
            prev.map(p =>
              p.userId === eventData.userId
                ? { ...p, isReady: updatedReady }
                : p
            )
          );
          break;
        }

      default:
        console.log('알 수 없는 이벤트:', eventData.eventType);
    }
  };

  const handleError = (data) => {
    console.error('📥 에러:', data);
    alert(data.detail || '오류가 발생했습니다.');
  };

  // 웹캠 상태 변경 시 내 정보 업데이트
  useEffect(() => {
    setParticipants(prev => prev.map(p =>
      p.isMe
        ? {
          ...p,
          webcamStatus: isWebcamOn ? 'on' : webcamError ? 'denied' : 'off'
        }
        : p
    ));
  }, [isWebcamOn, webcamError]);

  // 참가자 준비 상태 변경 시 allReady 계산
  useEffect(() => {
    const nonHostParticipants = participants.filter(p => !p.isHost);
    const allNonHostReady = nonHostParticipants.length > 0 &&
      nonHostParticipants.every(p => p.isReady);

    console.log('🔍 준비 상태 체크:', {
      nonHostCount: nonHostParticipants.length,
      allReady: allNonHostReady,
      participants: participants.map(p => ({
        nickname: p.nickname,
        isHost: p.isHost,
        isReady: p.isReady
      }))
    });

    setAllReady(allNonHostReady);
  }, [participants]);


  // 웹캠 권한 요청
  const handleWebcamRequest = async () => {
    try {
      await startWebcam();
    } catch (error) {
      console.error('웹캠 권한 거부:', error);
    }
  };

  // 내 정보 가져오기
  const me = participants.find(p => p.userId === myUserId);
  const isHost = me?.isHost || false;
  const isReady = me?.isReady || false;

  // 준비 상태 토글
  const handleReadyToggle = () => {
    const toggledReady = !isReady;

    // 낙관적 업데이트
    setParticipants((prevParticipants) =>
      prevParticipants.map((p) =>
        p.userId === myUserId ? { ...p, isReady: toggledReady } : p
      )
    );

    // WebSocket 전송
    websocketService.setReady(Number(roomId), toggledReady);
    console.log(`✅ 준비 상태 전송됨: ${toggledReady}`);
  };

  // 게임 시작 (방장만)
  const handleStartGame = () => {
    // TODO: WebSocket으로 게임 시작 전송
    navigate(`/quiz/game/${roomId}`);
  };

  // 방 나가기
  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    // TODO: WebSocket으로 방 나가기 전송
    navigate('/main');
  };

  // 웹캠 상태 아이콘 색상
  const getWebcamStatusColor = (status) => {
    switch (status) {
      case 'on': return 'var(--info-color)';
      case 'off': return '#999999';
      case 'denied': return 'var(--error-color)';
      default: return '#999999';
    }
  };

  // 웹캠 상태 툴팁 텍스트
  const getWebcamStatusText = (status) => {
    switch (status) {
      case 'on': return 'CAM ON';
      case 'off': return 'CAM OFF';
      case 'denied': return 'CAM DENIED';
      default: return 'CAM OFF';
    }
  };

  return (
    <div className={styles.quizWaitingRoom}>
      {/* 방 정보 섹션 */}
      <div className={styles.roomInfoSection}>
        <div className={styles.roomInfo}>
          <span className={styles.roomNumber}>방 번호: #{roomInfo.gameRoomId || roomId}</span>
          <h2 className={styles.roomTitle}>{roomInfo.gameTitle || '방 제목'}</h2>
        </div>
        <button className={styles.exitButton} onClick={handleExit}>
          나가기
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <main className={styles.waitingContent}>
        {/* 웹캠 제어 버튼 (상단) */}
        <div className={styles.webcamControlSection}>
          <button
            className={styles.webcamControlButton}
            onClick={isWebcamOn ? stopWebcam : handleWebcamRequest}
          >
            {isWebcamOn ? '웹캠 끄기' : '웹캠 켜기'}
          </button>
          <div className={styles.webcamStatus}>
            <div
              className={styles.webcamStatusDot}
              style={{ backgroundColor: getWebcamStatusColor(isWebcamOn ? 'on' : webcamError ? 'denied' : 'off') }}
            ></div>
            <span className={styles.webcamStatusText}>
              {getWebcamStatusText(isWebcamOn ? 'on' : webcamError ? 'denied' : 'off')}
            </span>
          </div>
        </div>

        {/* 준비/시작 버튼 */}
        <div className={styles.actionButtonContainer}>
          <button
            className={`${styles.actionButton} ${isHost
              ? styles.startButton
              : (isReady ? styles.readyActive : styles.readyInactive)
              } ${!isWebcamOn || (isHost && !allReady) ? styles.disabled : ''}`}
            onClick={
              isWebcamOn
                ? (isHost
                  ? (allReady ? handleStartGame : undefined)
                  : handleReadyToggle)
                : undefined
            }
            disabled={!isWebcamOn || (isHost && !allReady)}
          >
            {isHost
              ? allReady
                ? 'START'
                : 'WAITING...'
              : (isReady ? 'READY' : 'NOT READY')}
          </button>

          {/* 웹캠 필수 툴팁 */}
          {!isWebcamOn && (
            <div className={styles.webcamRequiredTooltip}>
              <span>웹캠을 켜야 {isHost ? '게임을 시작' : '준비'}할 수 있습니다</span>
            </div>
          )}
        </div>

        {/* 참가자 카드 영역 */}
        <div className={styles.participantsGrid}>
          {participants.map((participant) => (
            <div key={participant.id} className={styles.participantCard}>
              {/* 캠 상태 점 */}
              <div
                className={styles.camStatusDot}
                style={{ backgroundColor: getWebcamStatusColor(participant.webcamStatus) }}
                title={getWebcamStatusText(participant.webcamStatus)}
              ></div>

              {/* 방장 표시 */}
              {participant.isHost && (
                <span className={styles.hostBadge}>방장</span>
              )}

              {/* 웹캠 영역 */}
              <div className={styles.webcamArea}>
                {participant.userId === myUserId && isWebcamOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={styles.webcamVideo}
                  />
                ) : remoteStreams[participant.userId] ? (
                  <video
                    ref={el => remoteVideosRef.current[participant.userId] = el}
                    autoPlay
                    playsInline
                    className={styles.webcamVideo}
                  />
                ) : (
                  <div className={styles.webcamPlaceholder}>
                    <span>웹캠</span>
                  </div>
                )}
              </div>

              {/* 참가자 정보 */}
              <div className={styles.participantInfo}>
                <span className={styles.nickname}>
                  {participant.nickname}{participant.userId === myUserId ? ' (나)' : ''}
                </span>
                <span className={styles.score}>{participant.score}점</span>
              </div>

              {/* READY 상태 표시 (방장 제외, 모두 표시) */}
              {!participant.isHost && (
                <div
                  className={`${styles.readyBadge} ${participant.isReady ? styles.ready : styles.notReady
                    }`}
                >
                  {participant.isReady ? 'READY' : 'NOT READY'}
                </div>
              )}

              {/* 내 READY 상태 표시 (방장이 아닌 경우) */}
              {participant.userId === myUserId && !participant.isHost && (
                <div className={`${styles.myReadyStatus} ${participant.isReady ? styles.ready : styles.notReady}`}>
                  {participant.isReady ? 'READY' : 'NOT READY'}
                </div>
              )}
            </div>
          ))}

          {/* 빈 자리 카드들 */}
          {Array.from({ length: 4 - participants.length }, (_, index) => (
            <div key={`empty-${index}`} className={styles.emptyCard}>
              <span>대기중</span>
            </div>
          ))}
        </div>

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
            onClick={handleReadyToggle}
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

      {/* 나가기 확인 모달 */}
      {showExitModal && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowExitModal(false)}></div>
          <div className={styles.exitConfirmModal}>
            <h3>알림</h3>
            <p>정말로 나가시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={() => setShowExitModal(false)}>
                취소
              </button>
              <button className={styles.confirmButton} onClick={confirmExit}>
                나가기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizWaitingRoom;