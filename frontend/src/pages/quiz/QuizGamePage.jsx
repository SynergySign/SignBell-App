/**
 * @개요 퀴즈 진행 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @반환값 {JSX.Element} 퀴즈 진행 페이지 컴포넌트
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Toast from '../../components/ui/Toast';
import GameResultModal from '../../components/quiz/GameResultModal';
import useWebcamStore from '../../stores/useWebcamStore';
import { useJanus } from '../../contexts/JanusContext';
import websocketService from '../../services/websocket/websocketService';
import useUserStore from '../../stores/useUserStore';
import styles from './QuizGamePage.module.scss';

const QuizGamePage = () => {
  console.log('🚀🚀🚀 QuizGamePage 컴포넌트 렌더링 시작');
  
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('📍 roomId:', roomId);
  console.log('📍 location.state:', location.state);
  
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(8);
  const [currentWord, setCurrentWord] = useState(''); // 현재 문제 단어

  // Janus WebRTC 관리 (Context 사용 - 대기실과 공유)
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

  const remoteVideosRef = useRef({});

  // Zustand store에서 사용자 정보 가져오기
  const { userId: myUserId, nickname: myNickname } = useUserStore();

  const [showExitModal, setShowExitModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [timer, setTimer] = useState(10);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [challengersCount, setChallengersCount] = useState(0);
  const [maxChallengers] = useState(4);
  const [hasChallenged, setHasChallenged] = useState(false);
  const [challengeOrder, setChallengeOrder] = useState(null);
  const [gamePhase, setGamePhase] = useState('challenge'); // 'challenge', 'solving', 'result', 'myTurn'
  const [toast, setToast] = useState({
    isOpen: false,
    message: '',
    type: 'info'
  });
  const [solvingTimer, setSolvingTimer] = useState(5); // 5초 카운트다운 (준비 시간)
  const [signingTimer, setSigningTimer] = useState(10); // 10초 수어 표현 시간
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [currentChallenger, setCurrentChallenger] = useState(1); // 현재 도전자 순서
  const [totalChallengers, setTotalChallengers] = useState(2); // 총 도전자 수
  const [isWaitingResult, setIsWaitingResult] = useState(false); // 수어 인식 결과 대기 중
  const [resultMessage, setResultMessage] = useState(''); // 결과 메시지

  // 플레이어 데이터 (WebSocket에서 받아서 초기화)
  const [players, setPlayers] = useState([]);

  // 도전자 대기열 (선착순)
  const [challengerQueue, setChallengerQueue] = useState([]);

  // 현재 도전자 정보 (메인 카드에 표시될 사용자)
  const [currentChallengerInfo, setCurrentChallengerInfo] = useState({
    id: null,
    nickname: '대기중',
    score: 0
  });

  // 현재 도전자 및 플레이어 상태 업데이트
  useEffect(() => {
    console.log('🔄 useEffect 실행 - gamePhase:', gamePhase);

    if (gamePhase === 'myTurn') {
      // 내 정보를 메인 카드에 표시
      const myInfo = players.find(player => player.isMe);
      if (myInfo) {
        console.log('🔄 myTurn - 내 정보 설정:', myInfo);
        setCurrentChallengerInfo({
          id: myInfo.id,
          nickname: myInfo.nickname,
          score: myInfo.score
        });

        // 내가 현재 플레이어로 설정
        setPlayers(prev => prev.map(player => ({
          ...player,
          isCurrentPlayer: player.isMe
        })));
      }
    } else if (gamePhase === 'challenge') {
      // 도전 신청 단계 - 메인 카드는 대기중으로 표시
      console.log('🔄 challenge - 대기중으로 초기화');
      setCurrentChallengerInfo({
        id: null,
        nickname: '대기중',
        score: 0
      });

      // 모든 플레이어의 현재 플레이어 상태 해제
      setPlayers(prev => prev.map(player => ({
        ...player,
        isCurrentPlayer: false
      })));
    } else if (gamePhase === 'solving') {
      // solving 단계는 handleNextChallenger에서 이미 처리했으므로 아무것도 안 함
      console.log('🔄 solving - handleNextChallenger에서 처리됨, 건너뜀');
    }
  }, [gamePhase]);

  // 임시 순위 데이터 (실제로는 WebSocket에서 받음)
  const [rankings] = useState([
    { rank: 1, userId: 123, nickname: '사용자1', score: 350 },
    { rank: 2, userId: 456, nickname: '사용자2', score: 200 },
    { rank: 3, userId: 789, nickname: '사용자3', score: 150 },
    { rank: 4, userId: 101, nickname: '사용자4', score: 80 },
  ]);

  // ============================================
  // 웹캠 관리 (Zustand store 사용)
  // ============================================
  const stream = useWebcamStore(state => state.stream);
  const isWebcamOn = useWebcamStore(state => state.isWebcamOn);
  const webcamError = useWebcamStore(state => state.error);
  const startWebcam = useWebcamStore(state => state.startWebcam);
  const stopWebcam = useWebcamStore(state => state.stopWebcam);
  const toggleWebcam = useWebcamStore(state => state.toggleWebcam);
  
  // 로컬 비디오 ref (메인 카드용)
  const mainVideoRef = useRef(null);

  // 게임 시작 시 웹캠 자동 시작 (대기실에서 이미 켜져 있으면 유지)
  const webcamInitializedRef = useRef(false);
  const startWebcamAttemptedRef = useRef(false);
  
  useEffect(() => {
    console.log('📹 웹캠 초기화 체크:', { 
      isWebcamOn, 
      initialized: webcamInitializedRef.current,
      attempted: startWebcamAttemptedRef.current 
    });

    // 이미 초기화 완료했으면 스킵
    if (webcamInitializedRef.current) {
      return;
    }

    // 웹캠이 이미 켜져있으면 초기화 완료로 표시
    if (isWebcamOn) {
      console.log('✅ 웹캠 이미 켜져 있음 - 유지');
      webcamInitializedRef.current = true;
      return;
    }

    // 웹캠이 꺼져있고, 아직 시작 시도를 안 했으면 시작
    if (!startWebcamAttemptedRef.current) {
      console.log('📹 게임 페이지 마운트 - 웹캠 자동 시작 시도');
      startWebcamAttemptedRef.current = true;
      
      startWebcam().then(() => {
        console.log('✅ 웹캠 시작 성공');
        webcamInitializedRef.current = true;
      }).catch((error) => {
        console.error('❌ 웹캠 시작 실패:', error);
        webcamInitializedRef.current = true; // 실패해도 재시도 방지
      });
    }

    // cleanup에서 웹캠을 끄지 않음 - 게임 진행 중에는 계속 켜져 있어야 함
  }, [isWebcamOn]);

  // 메인 비디오에 스트림 연결
  useEffect(() => {
    console.log('📹 메인 비디오 스트림 연결 시도:', { 
      hasMainVideoRef: !!mainVideoRef.current,
      hasStream: !!stream,
      streamActive: stream?.active,
      streamTracks: stream?.getTracks().length 
    });
    
    if (stream && mainVideoRef.current) {
      mainVideoRef.current.srcObject = stream;
      console.log('✅ 메인 비디오 스트림 연결 완료');
    }
  }, [stream, gamePhase]); // gamePhase 변경 시에도 재연결

  // Janus 서버 URL
  const JANUS_SERVER = import.meta.env.VITE_JANUS_SERVER || 'https://janus.jsflux.co.kr/janus';

  // Janus WebRTC 연결 (웹캠 켜진 후)
  useEffect(() => {
    console.log('🔍 Janus 연결 체크:', { isJanusConnected, hasJanusRef: !!janusRef.current, isWebcamOn, hasStream: !!stream });
    
    // 이미 Janus가 연결되어 있으면 재연결하지 않음 (대기실에서 연결 유지)
    if (isJanusConnected && janusRef.current) {
      console.log('✅ Janus 이미 연결됨 - 기존 연결 유지');
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

    // Zustand에서 실제 사용자 ID 가져오기
    const actualUserId = myUserId;
    if (!actualUserId) {
      console.error('❌ 사용자 ID가 없습니다.');
      return;
    }

    const Janus = window.Janus;

    console.log('🎥 Janus 연결 시작 (게임 페이지):', { roomId, myUserId: actualUserId });

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
              opaqueId: `game-user-${actualUserId}`,
              success: function (pluginHandle) {
                console.log('✅ VideoRoom 플러그인 연결 성공');
                pluginHandleRef.current = pluginHandle;

                // 방 참여 (publisher로)
                const register = {
                  request: 'join',
                  room: parseInt(roomId),
                  ptype: 'publisher',
                  display: String(actualUserId),
                };

                pluginHandle.send({ message: register });
              },
              error: function (error) {
                console.error('❌ 플러그인 연결 실패:', error);
              },
              onmessage: function (msg, jsep) {
                console.log('📨 Janus 메시지 수신:', msg);
                const event = msg['videoroom'];

                // 방이 없으면 생성 (대기실에서 이미 생성했어야 하지만 혹시 모르니)
                if (event === 'event' && msg['error_code'] === 426) {
                  console.log('⚠️ Janus 방이 없음 - 방 생성 시도');

                  const create = {
                    request: 'create',
                    room: parseInt(roomId),
                    description: `Game Room ${roomId}`,
                    publishers: 10,
                    bitrate: 128000,
                    fir_freq: 10,
                    audiocodec: 'opus',
                    videocodec: 'vp8',
                    audiolevel_event: true,
                    audio_level_average: 65,
                    audio_active_packets: 25,
                    record: false,
                    permanent: false
                  };

                  pluginHandleRef.current.send({
                    message: create,
                    success: function (result) {
                      console.log('✅ Janus 방 생성 성공:', result);

                      // 방 생성 후 다시 참여 시도
                      const register = {
                        request: 'join',
                        room: parseInt(roomId),
                        ptype: 'publisher',
                        display: String(tempUserId),
                      };

                      pluginHandleRef.current.send({ message: register });
                    },
                    error: function (error) {
                      console.error('❌ Janus 방 생성 실패:', error);
                    }
                  });
                  return;
                }

                if (event === 'joined') {
                  const myFeedId = msg['id'];
                  console.log('✅ Janus 방 참여 성공, My Feed ID:', myFeedId);
                  setIsJanusConnected(true);

                  // 내 스트림 publish
                  publishOwnFeed();

                  // 기존 참가자 구독 (자기 자신 제외)
                  if (msg['publishers']) {
                    msg['publishers'].forEach((publisher) => {
                      const userId = parseInt(publisher.display);
                      console.log('📺 기존 참가자 발견:', publisher.display, 'Feed ID:', publisher.id, '내 ID:', actualUserId);
                      
                      // 자기 자신은 구독하지 않음
                      if (userId !== actualUserId) {
                        userIdToFeedIdRef.current[userId] = publisher.id;
                        subscribeToFeed(publisher.id, userId);
                      } else {
                        console.log('⏭️ 자기 자신은 구독 스킵');
                      }
                    });
                  }
                } else if (event === 'event') {
                  // 새 참가자 입장 (자기 자신 제외)
                  if (msg['publishers']) {
                    msg['publishers'].forEach((publisher) => {
                      const userId = parseInt(publisher.display);
                      console.log('📺 새 참가자 입장:', publisher.display, 'Feed ID:', publisher.id, '내 ID:', actualUserId);
                      
                      // 자기 자신은 구독하지 않음
                      if (userId !== actualUserId) {
                        userIdToFeedIdRef.current[userId] = publisher.id;
                        subscribeToFeed(publisher.id, userId);
                      } else {
                        console.log('⏭️ 자기 자신은 구독 스킵');
                      }
                    });
                  }
                  // 참가자 퇴장
                  if (msg['leaving']) {
                    const leavingFeedId = msg['leaving'];
                    console.log('👋 Janus 참가자 퇴장, Feed ID:', leavingFeedId);

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
        stream: stream,
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
        opaqueId: `subscriber-${actualUserId}-${feedId}`,
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
      // 게임 페이지에서는 Janus 연결을 끊지 않음 (대기실로 돌아갈 수 있으므로)
      console.log('🧹 게임 페이지 언마운트 - Janus 연결 유지');
    };
  }, [isWebcamOn, stream, roomId, isJanusConnected]);

  // 원격 스트림을 video 엘리먼트에 연결
  useEffect(() => {
    console.log('🔍 원격 스트림 연결 시도:', {
      remoteStreamsCount: Object.keys(remoteStreams).length,
      remoteStreamsKeys: Object.keys(remoteStreams),
      remoteVideosRefKeys: Object.keys(remoteVideosRef.current)
    });

    // 약간의 지연을 두고 연결 시도 (video 엘리먼트가 렌더링될 시간 확보)
    const timer = setTimeout(() => {
      Object.entries(remoteStreams).forEach(([userId, remoteStream]) => {
        const videoElement = remoteVideosRef.current[userId];
        console.log(`📺 User ${userId} 연결 시도:`, {
          hasVideoElement: !!videoElement,
          hasRemoteStream: !!remoteStream,
          streamActive: remoteStream?.active
        });

        if (videoElement && remoteStream) {
          videoElement.srcObject = remoteStream;
          console.log('✅ 비디오 엘리먼트에 스트림 연결 완료, User ID:', userId);
        } else if (!videoElement) {
          console.warn('⚠️ 비디오 엘리먼트 없음, User ID:', userId);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [remoteStreams, players]); // players 변경 시에도 재연결 (렌더링 후)

  // 게임 단계 변경 시 웹캠 자동 관리
  useEffect(() => {
    console.log('🎮 게임 단계 변경:', gamePhase, '웹캠 상태:', isWebcamOn);
    // 게임 진행 중에는 웹캠을 자동으로 끄지 않음
    // 사용자가 직접 헤더의 웹캠 끄기 버튼을 눌러야만 꺼짐
    if (gamePhase === 'myTurn' && !isWebcamOn) {
      // 내 차례인데 웹캠이 꺼져있으면 켜기
      console.log('📹 웹캠 자동 켜기 시도 (내 차례)');
      startWebcam();
    }
    // solving 단계에서는 웹캠을 끄지 않음 - 다른 참가자들이 계속 볼 수 있어야 함
  }, [gamePhase]);

  // ============================================
  // WebSocket 연동 영역
  // ============================================
  useEffect(() => {
    console.log('🎮 게임 페이지 진입 - 초기화 시작');
    console.log('🔌 WebSocket 연결 상태:', websocketService.isConnected());
    
    // WebSocket이 연결되어 있지 않으면 경고만 출력 (초기화는 계속 진행)
    if (!websocketService.isConnected()) {
      console.warn('⚠️ WebSocket이 연결되어 있지 않습니다. 재연결 시도...');
      // TODO: WebSocket 재연결 로직
    }

    // 1단계: 초기 상태 설정 (대기실에서 전달받은 정보) - 이벤트 핸들러 등록 전에 먼저 실행!
    console.log('🔍🔍🔍 location.state 전체:', JSON.stringify(location.state, null, 2));

    if (location.state) {
      const { totalQuestions: total, firstQuestion, firstWord, participants: waitingRoomParticipants, myUserId: myId } = location.state;

      console.log('🔍 전달받은 데이터:', {
        total,
        firstQuestion,
        firstWord,
        'waitingRoomParticipants 타입': typeof waitingRoomParticipants,
        'waitingRoomParticipants 길이': waitingRoomParticipants?.length,
        waitingRoomParticipants,
        myId
      });

      if (total) setTotalQuestions(total);
      if (firstQuestion) setCurrentQuestion(firstQuestion);
      if (firstWord) {
        setCurrentWord(firstWord);
        console.log('✅ 첫 번째 문제:', firstWord);
      }

      // 참가자 정보 초기화 (대기실에서 전달받음)
      if (waitingRoomParticipants && waitingRoomParticipants.length > 0) {
        // Zustand store에서 실제 로그인한 사용자 ID 가져오기
        let actualMyUserId = myUserId || myId;

        console.log('✅ Zustand store에서 사용자 ID 확인:', actualMyUserId);
        console.log('✅ 백엔드에서 받은 ID:', myId);

        // 만약 내 ID가 참가자 목록에 없으면, 백엔드 ID 사용
        const isMyIdInParticipants = waitingRoomParticipants.some(p => p.userId === actualMyUserId);
        if (!isMyIdInParticipants && myId) {
          console.warn('⚠️ Zustand ID가 참가자 목록에 없음. 백엔드 ID 사용:', myId);
          actualMyUserId = myId;
        }

        // 그래도 없으면 첫 번째 참가자를 "나"로 설정
        if (!waitingRoomParticipants.some(p => p.userId === actualMyUserId)) {
          console.warn('⚠️ 내 ID가 참가자 목록에 없음. 첫 번째 참가자를 "나"로 설정');
          actualMyUserId = waitingRoomParticipants[0].userId;
        }

        const initialPlayers = waitingRoomParticipants.map(p => ({
          id: p.userId,
          nickname: p.nickname,
          score: 0,
          isMe: p.userId === actualMyUserId,
          isCurrentPlayer: false,
          hasChallenged: false,
          challengeOrder: null
        }));

        setPlayers(initialPlayers);
        console.log('✅ 플레이어 초기화 완료:', initialPlayers);
        console.log('✅ 실제 내 ID:', actualMyUserId);
        console.log('✅ Zustand에서 가져온 ID:', myUserId);
      } else {
        console.error('❌ 참가자 정보가 없습니다.');
        console.log('⚠️ 게임이 이미 시작되었거나 방 정보가 손실되었습니다.');
        console.log('⚠️ 백엔드를 재시작하거나 새로운 방을 만들어주세요.');
        alert('참가자 정보를 불러올 수 없습니다.\n\n가능한 원인:\n1. 게임이 이미 시작된 방입니다\n2. 방 정보가 손실되었습니다\n\n해결 방법:\n- 백엔드를 재시작하거나\n- 새로운 방을 만들어주세요');
        navigate('/main');
      }
    } else {
      console.error('❌ location.state가 없습니다! 기본값으로 초기화');

      // 기본 플레이어 설정 (Zustand에서 가져온 사용자만)
      if (myUserId) {
        const defaultPlayers = [{
          id: myUserId,
          nickname: myNickname || '나',
          score: 0,
          isMe: true,
          isCurrentPlayer: false,
          hasChallenged: false,
          challengeOrder: null
        }];
        setPlayers(defaultPlayers);
        console.log('✅ 기본 플레이어 초기화:', defaultPlayers);
      } else {
        alert('게임 정보를 불러올 수 없습니다.\n메인 페이지로 이동합니다.');
        navigate('/main');
      }
    }

    // 2단계: players 초기화 완료 후 이벤트 핸들러 등록
    console.log('🎮 WebSocket 토픽 구독 및 이벤트 핸들러 등록');

    // 게임 관련 토픽 구독
    websocketService.subscribeToGameTopics(Number(roomId));

    // 이벤트 핸들러 등록
    websocketService.on('quiz:question', handleNewQuestion);
    websocketService.on('quiz:challenge', handleChallengeUpdate);
    websocketService.on('quiz:challenge:personal', handlePersonalChallengeResponse);
    websocketService.on('quiz:challenger', handleNextChallenger);
    websocketService.on('quiz:answer', handleAnswerResult);
    websocketService.on('quiz:result', handleGameEnd);
    websocketService.on('quiz:return', handleReturnToRoom);
    websocketService.on('quiz:timeout', handleChallengeTimeout);
    websocketService.on('error', handleError);

    return () => {
      console.log('🧹 게임 페이지 언마운트 - 이벤트 핸들러 제거');
      websocketService.off('quiz:question', handleNewQuestion);
      websocketService.off('quiz:challenge', handleChallengeUpdate);
      websocketService.off('quiz:challenge:personal', handlePersonalChallengeResponse);
      websocketService.off('quiz:challenger', handleNextChallenger);
      websocketService.off('quiz:answer', handleAnswerResult);
      websocketService.off('quiz:result', handleGameEnd);
      websocketService.off('quiz:return', handleReturnToRoom);
      websocketService.off('quiz:timeout', handleChallengeTimeout);
      websocketService.off('error', handleError);

      // 게임 토픽 구독 해제
      websocketService.unsubscribeFromGameTopics(Number(roomId));
    };
  }, [roomId, navigate]);

  // ============================================
  // WebSocket 이벤트 핸들러
  // ============================================

  /**
   * 새 문제 수신 처리
   */
  const handleNewQuestion = (data) => {
    console.log('📥 새 문제 수신:', data);

    if (data.success && data.data) {
      const questionData = data.data;
      setCurrentQuestion(questionData.questionNumber);
      setCurrentWord(questionData.wordTitle);

      // 상태 초기화
      setTimer(10);
      setIsTimerActive(true);
      setChallengersCount(0);
      setHasChallenged(false);
      setChallengeOrder(null);
      setGamePhase('challenge');
      setCurrentChallenger(1);
      setChallengerQueue([]);

      setPlayers(prev => prev.map(player => ({
        ...player,
        hasChallenged: false,
        challengeOrder: null,
        isCurrentPlayer: false
      })));

      showToast(`문제 ${questionData.questionNumber}: ${questionData.wordTitle}`, 'info');
    }
  };

  /**
   * 도전 신청 업데이트 처리 (브로드캐스트)
   */
  const handleChallengeUpdate = (data) => {
    console.log('📥 도전 신청 업데이트:', data);

    if (data.success && data.data) {
      const eventData = data.data;

      if (eventData.eventType === 'CHALLENGER_REGISTERED') {
        setChallengersCount(eventData.challengerCount);
        console.log('✅ 도전자 수 업데이트:', eventData.challengerCount);
      }
    }
  };

  /**
   * 도전 신청 개인 응답 처리
   */
  const handlePersonalChallengeResponse = (data) => {
    console.log('📥 도전 신청 개인 응답:', data);

    if (data.success && data.data) {
      const order = data.data.order;
      setChallengeOrder(order);
      showToast(`도전 신청 완료! ${order}번째 도전자로 신청되었습니다!`, 'success');
      console.log('✅ 내 도전 순서:', order);
    }
  };

  /**
   * 다음 도전자 차례 처리
   */
  const handleNextChallenger = (data) => {
    console.log('📥📥📥 다음 도전자 RAW:', JSON.stringify(data, null, 2));

    if (data.success && data.data) {
      const challengerData = data.data;
      const nextUserId = challengerData.userId;
      const nickname = challengerData.nickname;
      const profileImage = challengerData.profileImage;

      console.log('🎯 다음 도전자 - userId:', nextUserId, 'nickname:', nickname);
      console.log('🎯 현재 myUserId:', myUserId);

      // players 상태를 직접 읽지 말고, setPlayers의 함수형 업데이트로 최신 값 사용
      setPlayers(currentPlayers => {
        console.log('🎯 현재 players (함수형 업데이트):', currentPlayers);

        // 플레이어에서 점수 찾기
        const player = currentPlayers.find(p => p.id === nextUserId);
        const score = player ? player.score : 0;

        console.log('🎯 도전자 점수:', score, 'player:', player);

        // 메인 카드에 도전자 정보 설정 (백엔드에서 받은 정보 사용)
        const challengerInfo = {
          id: nextUserId,
          nickname: nickname,
          profileImage: profileImage,
          score: score
        };

        console.log('🎯 currentChallengerInfo 설정:', challengerInfo);
        setCurrentChallengerInfo(challengerInfo);

        // 내가 다음 도전자인지 확인
        const myInfo = currentPlayers.find(p => p.isMe);
        console.log('🎯 내 정보:', myInfo);
        console.log('🎯 내 차례인가?', myInfo && myInfo.id === nextUserId);

        if (myInfo && myInfo.id === nextUserId) {
          // 내 차례
          console.log('✅ 내 차례 시작!');
          setGamePhase('myTurn');
          setSolvingTimer(5);
          setSigningTimer(10);
          showToast('내 차례! 준비하세요! 5초 후 수어 동작을 시작합니다.', 'info');
        } else {
          // 다른 사람 차례
          console.log('⏳ 다른 사람 차례:', nickname);
          setGamePhase('solving');
          showToast(`${nickname}의 차례입니다.`, 'info');
        }

        // 플레이어 상태 업데이트 (현재 도전자 표시) 후 반환
        const updated = currentPlayers.map(player => ({
          ...player,
          isCurrentPlayer: player.id === nextUserId
        }));
        console.log('🎯 플레이어 업데이트 후:', updated);
        return updated;
      });
    } else {
      console.error('❌ 다음 도전자 데이터 없음:', data);
    }
  };

  /**
   * 도전 신청 타임아웃 처리
   */
  const handleChallengeTimeout = (data) => {
    console.log('📥 도전 신청 타임아웃:', data);

    if (data.success) {
      showToast(data.message || '도전 신청 시간이 종료되었습니다.', 'info');
    }
  };

  /**
   * 정답 결과 처리
   */
  const handleAnswerResult = (data) => {
    console.log('📥 정답 결과:', data);

    if (data.success && data.data) {
      const result = data.data;

      // 점수 업데이트
      setPlayers(prev => prev.map(player =>
        player.id === result.userId
          ? { ...player, score: result.totalScore }
          : player
      ));

      if (result.isCorrect) {
        showToast(`정답! +${result.score}점`, 'success');
      } else {
        showToast(`오답! ${result.score}점`, 'error');
      }
    }
  };

  /**
   * 게임 종료 처리
   */
  const handleGameEnd = (data) => {
    console.log('📥 게임 종료:', data);

    if (data.success && data.data) {
      const endData = data.data;

      if (endData.eventType === 'QUIZ_FINISHED') {
        // 순위 정보 업데이트 및 결과 모달 표시
        // TODO: rankings 상태 업데이트
        setTimeout(() => {
          setShowResultModal(true);
        }, 1000);
      }
    }
  };

  /**
   * 에러 처리
   */
  const handleError = (data) => {
    console.error('📥 에러:', data);
    showToast(data.message || '오류가 발생했습니다.', 'error');
  };

  // ============================================
  // TODO: WebRTC 연동 영역
  // ============================================
  // useEffect(() => {
  //   // WebRTC 연결 설정
  //   // 각 참가자의 비디오 스트림 연결
  // }, []);

  // ============================================
  // TODO: MediaPipe 수어 인식 영역
  // ============================================
  // useEffect(() => {
  //   if (gamePhase === 'myTurn' && solvingTimer === 0) {
  //     // MediaPipe 수어 인식 시작
  //     // FastAPI 서버로 프레임 전송
  //   }
  // }, [gamePhase, solvingTimer]);

  // ============================================
  // 문제 데이터
  // ============================================
  const questionData = {
    word: currentWord || '문제를 불러오는 중...',
  };

  // ============================================
  // 타이머 관리 useEffect
  // ============================================

  // 10초 타이머 (도전 신청)
  useEffect(() => {
    if (isTimerActive && timer > 0 && gamePhase === 'challenge') {
      const countdown = setTimeout(() => {
        setTimer(timer - 1);
      }, 1000);

      return () => clearTimeout(countdown);
    } else if (timer === 0 && gamePhase === 'challenge') {
      handleTimerEnd();
    }
  }, [timer, isTimerActive, gamePhase]);

  // 5초 카운트다운 (내 차례 준비)
  useEffect(() => {
    if (gamePhase === 'myTurn' && solvingTimer > 0 && signingTimer === 10) {
      const countdown = setTimeout(() => {
        setSolvingTimer(solvingTimer - 1);
      }, 1000);

      return () => clearTimeout(countdown);
    } else if (gamePhase === 'myTurn' && solvingTimer === 0 && signingTimer === 10) {
      // 카운트다운 완료 - 수어 동작 시작
      handleStartSigning();
    }
  }, [solvingTimer, gamePhase, signingTimer]);

  // 10초 수어 표현 타이머
  useEffect(() => {
    if (gamePhase === 'myTurn' && solvingTimer === 0 && signingTimer > 0 && signingTimer < 10) {
      const countdown = setTimeout(() => {
        setSigningTimer(signingTimer - 1);
      }, 1000);

      return () => clearTimeout(countdown);
    } else if (gamePhase === 'myTurn' && signingTimer === 0) {
      // 수어 표현 시간 종료
      handleSigningResult();
    }
  }, [signingTimer, gamePhase, solvingTimer]);

  // 토스트 자동 닫기 (3초 후)
  useEffect(() => {
    if (toast.isOpen) {
      const autoClose = setTimeout(() => {
        closeToast();
      }, 3000);

      return () => clearTimeout(autoClose);
    }
  }, [toast.isOpen]);

  // ============================================
  // 게임 플로우 핸들러 함수들
  // ============================================

  /**
   * 도전 신청 타이머 종료 처리
   * - 도전자 없음: 다음 문제로 이동
   * - 도전자 있음: 문제 풀이 시작
   */
  const handleTimerEnd = () => {
    setIsTimerActive(false);

    if (challengersCount === 0 || challengerQueue.length === 0) {
      // 도전자 없음 - 다음 문제로
      showToast('도전 신청 시간이 종료되었습니다. 다음 문제로 이동합니다.', 'info');

      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    } else {
      // 도전자 있음 - 첫 번째 도전자부터 시작
      const firstChallenger = challengerQueue[0];
      setTotalChallengers(challengerQueue.length);
      setCurrentChallenger(1);

      showToast('도전 신청이 마감되었습니다. 도전자 차례입니다.', 'info');

      setTimeout(() => {
        // 첫 번째 도전자가 나인지 확인
        if (firstChallenger && firstChallenger.id === players.find(p => p.isMe)?.id) {
          setGamePhase('myTurn');
          setSolvingTimer(5);
          setSigningTimer(10);
          showToast('내 차례! 준비하세요! 5초 후 수어 동작을 시작합니다.', 'info');
        } else {
          setGamePhase('solving');
        }
      }, 2000);
    }
  };

  /**
   * 다음 문제로 이동
   * - 마지막 문제인 경우: 게임 결과 모달 표시
   * - 그 외: 다음 문제 로드 및 상태 초기화
   * TODO: WebSocket으로 다음 문제 요청
   */
  const moveToNextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
      setTimer(10);
      setIsTimerActive(true);
      setChallengersCount(0);
      setHasChallenged(false);
      setChallengeOrder(null);
      setGamePhase('challenge');
      setCurrentChallenger(1);

      // 도전자 대기열 및 플레이어 상태 초기화
      setChallengerQueue([]);
      setPlayers(prev => prev.map(player => ({
        ...player,
        hasChallenged: false,
        challengeOrder: null,
        isCurrentPlayer: false
      })));

      // TODO: WebSocket 전송
      // stompClient.send(`/app/room/${roomId}/quiz/next`, {}, JSON.stringify({
      //   questionNumber: currentQuestion + 1
      // }));
    } else {
      // 게임 종료 - 결과 모달 표시
      setTimeout(() => {
        setShowResultModal(true);
      }, 1000);
      // TODO: WebSocket 전송
      // stompClient.send(`/app/room/${roomId}/quiz/end`, {}, JSON.stringify({}));
    }
  };

  /**
   * 대기실로 돌아가기
   * TODO: WebSocket으로 대기실 복귀 전송
   */
  const handleReturnToRoom = () => {
    // TODO: WebSocket 전송
    // stompClient.send(`/app/room/${roomId}/return`, {}, JSON.stringify({}));
    navigate(`/quiz/waiting/${roomId}`);
  };

  /**
   * 수어 표현 시작 (준비 카운트다운 완료 후)
   * TODO: MediaPipe 수어 인식 시작
   */
  const handleStartSigning = () => {
    // 수어 표현 타이머 시작
    setSigningTimer(9); // 10초부터 시작하므로 9로 설정
    // TODO: MediaPipe 시작
    // startMediaPipe();
  };

  /**
   * 수어 표현 결과 처리 (임시: 랜덤)
   * TODO: FastAPI 서버에서 받은 결과로 처리
   */
  const handleSigningResult = () => {
    // 수어 인식 결과 대기 상태로 전환
    setIsWaitingResult(true);
    setResultMessage('수어 인식 중...');

    // TODO: FastAPI 서버로 수어 데이터 전송
    // const response = await fetch('http://fastapi-server/api/verify-sign', {
    //   method: 'POST',
    //   body: JSON.stringify({ handLandmarks: ... })
    // });

    // 임시: 6~10초 사이 랜덤 대기 시간
    const waitTime = Math.floor(Math.random() * 4000) + 6000; // 6000~10000ms

    setTimeout(() => {
      // 임시로 50% 확률로 정답/오답 처리
      const isCorrect = Math.random() > 0.5;

      if (isCorrect) {
        setResultMessage('정답입니다! 🎉');

        setTimeout(() => {
          setIsWaitingResult(false);
          setResultMessage('');
          moveToNextQuestion();
        }, 2000);
      } else {
        setResultMessage('오답입니다 😢');

        setTimeout(() => {
          setIsWaitingResult(false);
          setResultMessage('');
          moveToNextChallenger();
        }, 2000);
      }
    }, waitTime);
  };

  /**
   * 다음 도전자로 이동 (로컬 로직 - 테스트용)
   * - 남은 도전자 있음: 다음 도전자 차례
   * - 모든 도전자 실패: 다음 문제로 이동
   * TODO: WebSocket으로 다음 도전자 알림
   */
  const moveToNextChallenger = () => {
    const totalChallengerCount = challengerQueue.length;

    if (currentChallenger < totalChallengerCount) {
      const nextChallengerIndex = currentChallenger; // 0-based index
      const nextChallenger = challengerQueue[nextChallengerIndex];

      setCurrentChallenger(currentChallenger + 1);

      // 내 차례인지 확인
      if (nextChallenger && nextChallenger.id === players.find(p => p.isMe)?.id) {
        setGamePhase('myTurn');
        setSolvingTimer(5);
        setSigningTimer(10);
        showToast('내 차례! 준비하세요! 5초 후 수어 동작을 시작합니다.', 'info');
      } else {
        setGamePhase('solving');
        showToast(`${nextChallenger?.nickname || '도전자'}의 차례입니다.`, 'info');
      }

      // TODO: WebSocket 전송
      // stompClient.send(`/app/room/${roomId}/quiz/nextChallenger`, {}, JSON.stringify({
      //   challengerOrder: currentChallenger + 1,
      //   challengerId: nextChallenger?.id
      // }));
    } else {
      // 모든 도전자 실패 - 다음 문제로
      showToast('모든 도전자 실패! 다음 문제로 이동합니다.', 'info');

      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    }
  };

  /**
   * 내 차례 시작 (테스트용)
   * TODO: WebSocket에서 받은 신호로 처리
   */
  const handleMyTurn = () => {
    setIsMyTurn(true);
    setGamePhase('myTurn');
    setSolvingTimer(5);
    setSigningTimer(10);
    showToast('내 차례! 준비하세요! 5초 후 수어 동작을 시작합니다.', 'info');
  };

  // ============================================
  // UI 헬퍼 함수들
  // ============================================

  /**
   * 토스트 메시지 표시
   */
  const showToast = (message, type = 'info') => {
    setToast({
      isOpen: true,
      message,
      type
    });
  };

  /**
   * 토스트 메시지 닫기
   */
  const closeToast = () => {
    setToast({
      ...toast,
      isOpen: false
    });
  };

  /**
   * 방 나가기 확인 모달 표시
   */
  const handleExit = () => {
    setShowExitModal(true);
  };

  /**
   * 방 나가기 확정
   * TODO: WebSocket으로 방 나가기 전송
   */
  const confirmExit = () => {
    // TODO: WebSocket 전송
    // stompClient.send(`/app/room/${roomId}/exit`, {}, JSON.stringify({}));
    navigate('/main');
  };

  // ============================================
  // 도전 신청 핸들러
  // ============================================

  /**
   * 문제 도전하기 버튼 클릭
   * - 중복 신청 방지
   * - 정원 초과 방지
   * - 시간 종료 방지
   * TODO: WebSocket으로 도전 신청 전송
   */
  const handleChallenge = () => {
    const myInfo = players.find(player => player.isMe);

    if (!myInfo || myInfo.hasChallenged) {
      showToast('이미 도전 신청을 하셨습니다.', 'warning');
      return;
    }

    if (challengersCount >= maxChallengers) {
      showToast('도전자가 모두 찼습니다.', 'warning');
      return;
    }

    if (timer === 0) {
      showToast('도전 신청 시간이 종료되었습니다.', 'warning');
      return;
    }

    // 낙관적 업데이트 (서버 응답 전에 UI 업데이트)
    setHasChallenged(true);

    // 플레이어 상태 업데이트
    setPlayers(prev => prev.map(player =>
      player.isMe
        ? { ...player, hasChallenged: true }
        : player
    ));

    // WebSocket으로 도전 신청 전송
    try {
      websocketService.sendMessage(`/app/room/${roomId}/quiz/challenge`, {
        questionNumber: currentQuestion
      });
      console.log('✅ 도전 신청 전송:', { roomId, questionNumber: currentQuestion });
    } catch (error) {
      console.error('❌ 도전 신청 전송 실패:', error);
      showToast('도전 신청 전송에 실패했습니다.', 'error');
    }
  };

  return (
    <div className={styles.quizGamePage}>
      {/* 방 정보 섹션 */}
      <div className={styles.roomInfoSection}>
        <div className={styles.roomInfo}>
          <span className={styles.roomNumber}>방 번호: #{roomId}</span>
          <h2 className={styles.roomTitle}>방 제목</h2>
        </div>
        <div className={styles.headerControls}>
          <button
            className={styles.webcamToggleHeader}
            onClick={toggleWebcam}
          >
            {isWebcamOn ? '웹캠 끄기' : '웹캠 켜기'}
          </button>
          <button className={styles.exitButton} onClick={handleExit}>
            나가기
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <main className={styles.gameContent}>
        {/* 문제 제시 섹션 */}
        <div className={styles.questionSection}>
          <span className={styles.questionNumber}>
            (문제 {currentQuestion}/{totalQuestions})
          </span>
          <h1 className={styles.questionText}>
            '{questionData.word}'를 수어로 표현하세요.
          </h1>
        </div>

        {/* 메인 컨텐츠 영역 (가로 배치) */}
        <div className={styles.mainContentRow}>
          {/* 메인 영상 카드 (도전자) */}
          <div className={styles.mainVideoCard}>
            {/* 도전 중 표시 */}
            {(gamePhase === 'myTurn' || gamePhase === 'solving') && (
              <div className={styles.mainChallengerBadge}>도전 중</div>
            )}

            <div className={styles.mainWebcam}>
              {(() => {
                if (gamePhase === 'myTurn' && isWebcamOn) {
                  return (
                    <video
                      ref={mainVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={styles.webcamVideo}
                    />
                  );
                } else if (gamePhase === 'solving' && currentChallengerInfo.id && remoteStreams[currentChallengerInfo.id]) {
                  return (
                    <video
                      ref={el => remoteVideosRef.current[currentChallengerInfo.id] = el}
                      autoPlay
                      playsInline
                      className={styles.webcamVideo}
                    />
                  );
                } else {
                  return (
                    <div className={styles.challengerWebcam}>
                      <span>{gamePhase === 'myTurn' ? '내 웹캠' : currentChallengerInfo.nickname !== '대기중' ? `${currentChallengerInfo.nickname}의 웹캠` : '도전자 웹캠'}</span>
                    </div>
                  );
                }
              })()}
            </div>
            <div className={styles.mainPlayerInfo}>
              <span className={styles.mainPlayerName}>{currentChallengerInfo.nickname}</span>
              <span className={styles.mainPlayerScore}>{currentChallengerInfo.score}점</span>
            </div>
          </div>

          {/* 게임 상태별 UI */}
          <div className={styles.gameStateSection}>
            {gamePhase === 'challenge' && (
              <div className={styles.challengeSection}>
                {/* 타이머 표시 */}
                <div className={`${styles.timerDisplay} ${timer <= 3 ? styles.urgent : ''}`}>
                  <span className={styles.timerLabel}>남은 시간</span>
                  <span className={styles.timerValue}>{timer}초</span>
                </div>

                {/* 도전자 모집 정보 */}
                <div className={styles.challengeInfo}>
                  <span className={styles.challengeTooltip}>
                    선착순으로 도전자를 받는중입니다.
                  </span>
                  <span className={styles.challengeCount}>
                    {challengersCount}/{maxChallengers}
                  </span>
                </div>

                {/* 문제 도전하기 버튼 */}
                <button
                  className={`${styles.challengeButton} ${hasChallenged || challengersCount >= maxChallengers || timer === 0
                    ? styles.disabled
                    : styles.active
                    }`}
                  onClick={handleChallenge}
                  disabled={hasChallenged || challengersCount >= maxChallengers || timer === 0}
                >
                  {hasChallenged
                    ? `도전 신청 완료 (${challengeOrder}번째)`
                    : '문제 도전하기'}
                </button>
              </div>
            )}

            {gamePhase === 'solving' && (
              <div className={styles.solvingPhase}>
                <div className={styles.solvingMessage}>
                  <h2>{currentChallengerInfo.nickname}님이 문제를 풀고 있습니다...</h2>
                  <p>잠시만 기다려주세요</p>
                </div>
              </div>
            )}

            {gamePhase === 'myTurn' && (
              <div className={styles.myTurnPhase}>
                <div className={styles.countdownDisplay}>
                  <h2>내 차례입니다!</h2>
                  {isWaitingResult ? (
                    <>
                      <div className={styles.loadingSpinner}></div>
                      <p className={styles.waitingText}>{resultMessage}</p>
                      <p className={styles.waitingHint}>AI가 수어를 분석하고 있습니다</p>
                    </>
                  ) : solvingTimer > 0 ? (
                    <>
                      <p>수어 동작 준비하세요</p>
                      <div className={`${styles.countdownNumber} ${solvingTimer <= 2 ? styles.urgent : ''}`}>
                        {solvingTimer}
                      </div>
                      <p className={styles.prepareHint}>카메라를 확인하고 자세를 준비하세요</p>
                    </>
                  ) : (
                    <>
                      <p className={styles.signingText}>지금 수어를 표현하세요!</p>
                      <div className={styles.signingIndicator}>🤟</div>
                      <div className={`${styles.signingTimer} ${signingTimer <= 3 ? styles.urgent : ''}`}>
                        남은 시간: {signingTimer}초
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 작은 플레이어 카드들 (아래) */}
        <div className={styles.smallPlayersGrid}>
          {players.length === 0 && <div className={styles.loadingMessage}>플레이어 정보 로딩 중...</div>}
          {players
            .filter(player => {
              // 문제 풀이 단계에서는 현재 도전자를 제외하고 표시
              if (gamePhase === 'solving' || gamePhase === 'myTurn') {
                return !player.isCurrentPlayer;
              }
              // 도전 신청 단계에서는 모든 플레이어 표시
              return true;
            })
            .map((player) => (
              <div
                key={player.id}
                className={styles.smallPlayerCard}
              >
                <div className={styles.smallWebcam}>
                  {player.isMe && isWebcamOn ? (
                    gamePhase === 'myTurn' ? (
                      <span>내 차례</span>
                    ) : (
                      <video
                        ref={el => {
                          if (el && stream && el.srcObject !== stream) {
                            el.srcObject = stream;
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className={styles.smallWebcamVideo}
                      />
                    )
                  ) : !player.isMe && remoteStreams[player.id] ? (
                    <video
                      ref={el => {
                        if (el && remoteStreams[player.id] && el.srcObject !== remoteStreams[player.id]) {
                          remoteVideosRef.current[player.id] = el;
                          el.srcObject = remoteStreams[player.id];
                        }
                      }}
                      autoPlay
                      playsInline
                      className={styles.smallWebcamVideo}
                    />
                  ) : (
                    <span>웹캠 {player.isMe ? '(나)' : ''}</span>
                  )}
                </div>
                <div className={styles.smallPlayerInfo}>
                  <span className={styles.smallPlayerName}>
                    {player.nickname}{player.isMe ? ' (나)' : ''}
                  </span>
                  <span className={styles.smallPlayerScore}>{player.score}점</span>
                </div>
              </div>
            ))}
        </div>

        {/* 테스트용 버튼들 (맨 밑) */}
        <div className={styles.testButtons}>
          <button
            className={styles.testButton}
            onClick={() => {
              setGamePhase('challenge');
              setTimer(10);
              setIsTimerActive(true);
            }}
          >
            도전 신청 단계
          </button>
          <button
            className={styles.testButton}
            onClick={() => {
              // 임시로 다른 플레이어들도 도전 신청 추가
              const otherPlayers = players.filter(p => !p.isMe);
              const newQueue = otherPlayers.slice(0, 2).map((player, index) => ({
                id: player.id,
                nickname: player.nickname,
                score: player.score,
                order: index + 1
              }));
              setChallengerQueue(newQueue);
              setChallengersCount(newQueue.length);
              setTotalChallengers(newQueue.length);
              setCurrentChallenger(1);

              // 플레이어 상태 업데이트
              setPlayers(prev => prev.map(player => ({
                ...player,
                isCurrentPlayer: player.id === newQueue[0].id
              })));

              setGamePhase('solving');
            }}
          >
            문제 풀이 단계 (다른 사람)
          </button>
          <button
            className={styles.testButton}
            onClick={() => {
              // 내가 첫 번째 도전자로 설정
              const myInfo = players.find(p => p.isMe);
              if (myInfo) {
                setChallengerQueue([{
                  id: myInfo.id,
                  nickname: myInfo.nickname,
                  score: myInfo.score,
                  order: 1
                }]);
                setChallengersCount(1);
                setTotalChallengers(1);
                setCurrentChallenger(1);
                handleMyTurn();
              }
            }}
          >
            내 차례 (1번째 도전자)
          </button>
          <button
            className={styles.testButton}
            onClick={handleNextChallenger}
          >
            다음 도전자
          </button>
          <button
            className={styles.testButton}
            onClick={() => setShowResultModal(true)}
          >
            결과 모달 보기
          </button>
          <button
            className={styles.testButton}
            onClick={() => {
              setCurrentQuestion(8);
              moveToNextQuestion();
            }}
          >
            게임 종료 (8번 문제)
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

      {/* 토스트 알림 */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
      />

      {/* 게임 결과 모달 */}
      <GameResultModal
        isOpen={showResultModal}
        onReturnToRoom={handleReturnToRoom}
        rankings={rankings}
      />
    </div>
  );
};

export default QuizGamePage;
