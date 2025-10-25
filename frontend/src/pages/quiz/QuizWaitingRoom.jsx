/**
 * @개요 퀴즈 대기방 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-24 (Merge: dev + feature)
 * @반환값 {JSX.Element} 퀴즈 대기방 페이지 컴포넌트
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWebcamStore } from '../../store/webcam/webcamStore'; // [병합] '내 브랜치'의 Zustand 스토어 유지
import { useJanus } from '../../contexts/JanusContext'; // [병합] '내 브랜치'의 Janus Context 유지
import { useAuthStore } from '../../store/auth/authStore';
import styles from './QuizWaitingRoom.module.scss';
import websocketService from '../../services/websocket/websocketService.js';
import AlertModal from '../../components/ui/AlertModal.jsx'; // [병합] 'dev'의 AlertModal 가져오기

const QuizWaitingRoom = () => {
    console.log('🚪 QuizWaitingRoom 렌더링');

    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); // 🆕 location 추가
    const [showExitModal, setShowExitModal] = useState(false);
    const [allReady, setAllReady] = useState(false);

    // [병합] 'dev'의 방 종료 알림 모달 상태 추가
    const [showRoomClosedAlert, setShowRoomClosedAlert] = useState(false);

    // [병합] '내 브랜치'의 게임 페이지 이동 추적 Ref (Janus/WS 연결 유지용)
    const isNavigatingToGameRef = useRef(false);

    // Zustand store에서 사용자 정보 가져오기
    const { user, isAuthenticated, hasCheckedAuth } = useAuthStore();
    const myUserId = user?.userId;

    // [병합] '내 브랜치'의 useWebcamStore 사용 (dev의 useWebcam 훅 대신)
    const stream = useWebcamStore(state => state.stream);
    const isWebcamOn = useWebcamStore(state => state.isWebcamOn);
    const webcamError = useWebcamStore(state => state.error);
    const startWebcam = useWebcamStore(state => state.startWebcam);
    const stopWebcam = useWebcamStore(state => state.stopWebcam);
    const toggleWebcam = useWebcamStore(state => state.toggleWebcam);

    // 로컬 비디오 ref (useWebcamStore와 연동)
    const videoRef = useRef(null);

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

    console.log('👥 participants:', participants.length, participants);

    // ============================================
    // Janus WebRTC 관리 (Context 사용)
    // [병합] '내 브랜치'의 useJanus 컨텍스트 사용
    // ============================================
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

    const remoteVideosRef = useRef({}); // { userId: videoElement }

    // Janus 서버 URL
    const JANUS_SERVER = import.meta.env.VITE_JANUS_SERVER || 'https://janus.jsflux.co.kr/janus';

    // 'dev' 브랜치의 인증 체크 useEffect (동일)
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

    // [병합] 'dev'의 방 종료 이벤트 핸들러 추가
    const handleRoomClosed = (data) => {
        console.log('📥 방 종료 알림:', data);
        // AlertModal 표시
        setShowRoomClosedAlert(true);
    };

    // WebSocket 연결 (두 브랜치 로직 병합)
    useEffect(() => {
        if (!hasCheckedAuth || !isAuthenticated || !myUserId) {
            console.log('⏳ 인증 대기 중... WebSocket 연결 보류');
            return;
        }

        let isMounted = true;

        const initWebSocket = async () => {
            try {
                websocketService.on('room:join', handleRoomJoin);
                websocketService.on('participant', handleParticipantEvent);
                websocketService.on('quiz:start', handleGameStart); // [병합] '내 브랜치'의 게임 시작 이벤트
                websocketService.on('room:closed', handleRoomClosed); // [병합] 'dev'의 방 종료 이벤트
                websocketService.on('error', handleError); // [병합] '내 브랜치'의 개선된 에러 핸들러

                await websocketService.connect();
                console.log('✅ WebSocket 연결 성공!');

                setTimeout(() => {
                    // [병합] '내 브랜치'의 네비게이션 체크 로직 유지
                    if (isMounted && !isNavigatingToGameRef.current) {
                        websocketService.joinRoom(Number(roomId));
                        console.log(`🚪 방 ${roomId}에 입장 시도`);
                    } else {
                        console.log('⏭️ 게임 페이지로 이동 중이므로 방 입장 스킵');
                    }
                }, 300);

            } catch (error) {
                console.error('❌ WebSocket 연결 실패:', error);
                alert('연결 실패: ' + error.message);
            }
        };

        initWebSocket();

        return () => {
            isMounted = false;
            websocketService.off('room:join', handleRoomJoin);
            websocketService.off('participant', handleParticipantEvent);
            websocketService.off('quiz:start', handleGameStart);
            websocketService.off('room:closed', handleRoomClosed); // [병합] 'dev' 이벤트 정리
            websocketService.off('error', handleError);
        };
    }, [roomId, myUserId, isAuthenticated, hasCheckedAuth]);

    // 🆕 게임에서 돌아올 때 처리
    useEffect(() => {
        if (location.state?.returnFromGame) {
            console.log('🔄 게임에서 복귀 감지');
            
            // 🔥 중요: 모든 remote streams 강제 초기화
            console.log('🧹 게임 복귀 - Remote streams 강제 초기화');
            setRemoteStreams({});
            
            // Remote feeds 정리
            if (remoteFeedsRef.current && Object.keys(remoteFeedsRef.current).length > 0) {
                console.log('🧹 Remote feeds 정리:', Object.keys(remoteFeedsRef.current).length);
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
            
            console.log('✅ 게임 복귀 정리 완료 - WebSocket 재연결을 통해 참가자 정보 받음');
            
            // location.state 초기화 (중복 처리 방지)
            window.history.replaceState({}, document.title);
        }
    }, [location.state, setRemoteStreams, setIsJanusConnected, remoteFeedsRef, userIdToFeedIdRef]);

    // [병합] '내 브랜치'의 로직 (useWebcamStore의 stream을 videoRef에 연결)
    useEffect(() => {
        if (videoRef.current && stream) {
            console.log('📹 로컬 비디오 ref에 스트림 연결:', stream.id);
            videoRef.current.srcObject = stream;
            // 비디오 재생 확인
            videoRef.current.play().catch(err => {
                console.error('❌ 비디오 재생 실패:', err);
            });
        } else {
            console.log('⏳ 로컬 비디오 대기 중:', { 
                hasRef: !!videoRef.current, 
                hasStream: !!stream 
            });
        }
    }, [stream]);

    // [병합] '내 브랜치'의 Janus WebRTC 연결 useEffect (Context 사용, 426 에러 처리, 자기 자신 구독 방지, cleanup 시 네비게이션 체크)
    // (dev의 로컬 관리 로직 대신 이 로직을 통째로 사용)
    useEffect(() => {
        if (!myUserId || participants.length === 0) {
            console.log('⏳ 방 입장 대기 중... Janus 연결 보류');
            return;
        }

        if (!isWebcamOn || !stream) {
            console.log('⏳ 웹캠 대기 중... Janus 연결 보류');
            return;
        }

        if (!window.Janus) {
            console.error('❌ Janus 라이브러리가 로드되지 않았습니다.');
            return;
        }

        // 🆕 이미 연결되어 있으면 재연결하지 않음
        if (isJanusConnected && janusRef.current && pluginHandleRef.current) {
            console.log('✅ Janus 이미 연결됨 - 재연결 스킵');
            return;
        }

        const Janus = window.Janus;

        console.log('🎥 Janus 연결 시작:', { roomId, myUserId });

        Janus.init({
            debug: 'all',
            callback: function () {
                console.log('✅ Janus 초기화 완료');

                janusRef.current = new Janus({
                    server: JANUS_SERVER,
                    success: function () {
                        console.log('✅ Janus 서버 연결 성공');

                        janusRef.current.attach({
                            plugin: 'janus.plugin.videoroom',
                            opaqueId: `user-${myUserId}`,
                            success: function (pluginHandle) {
                                console.log('✅ VideoRoom 플러그인 연결 성공');
                                pluginHandleRef.current = pluginHandle;

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

                                // [병합] '내 브랜치'의 방 생성 로직 (426 에러)
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
                                                display: String(myUserId),
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

                                    publishOwnFeed();

                                    if (msg['publishers']) {
                                        msg['publishers'].forEach((publisher) => {
                                            const userId = parseInt(publisher.display);
                                            console.log('📺 기존 참가자 발견:', publisher.display, 'Feed ID:', publisher.id, '내 ID:', myUserId);

                                            // [병합] '내 브랜치'의 자기 자신 구독 방지
                                            if (userId !== myUserId) {
                                                userIdToFeedIdRef.current[userId] = publisher.id;
                                                subscribeToFeed(publisher.id, userId);
                                            } else {
                                                console.log('⏭️ 자기 자신은 구독 스킵');
                                            }
                                        });
                                    }
                                } else if (event === 'event') {
                                    if (msg['publishers']) {
                                        msg['publishers'].forEach((publisher) => {
                                            const userId = parseInt(publisher.display);
                                            console.log('📺 새 참가자 입장:', publisher.display, 'Feed ID:', publisher.id, '내 ID:', myUserId);

                                            // [병합] '내 브랜치'의 자기 자신 구독 방지
                                            if (userId !== myUserId) {
                                                userIdToFeedIdRef.current[userId] = publisher.id;
                                                subscribeToFeed(publisher.id, userId);
                                            } else {
                                                console.log('⏭️ 자기 자신은 구독 스킵');
                                            }
                                        });
                                    }
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

                                if (jsep) {
                                    pluginHandleRef.current.handleRemoteJsep({ jsep: jsep });
                                }
                            },
                            onlocalstream: function (localStream) {
                                console.log('✅ 로컬 스트림 수신 (Janus echo)');
                            },
                            onremotestream: function () {
                                // Publisher는 sendonly
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
                stream: stream, // [병합] '내 브랜치'의 useWebcamStore 스트림
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
            // [병합] '내 브랜치'의 게임 페이지 이동 시 Janus 연결 유지 로직
            if (isNavigatingToGameRef.current) {
                console.log('🎮 게임 페이지로 이동 - Janus 연결 유지');
                return;
            }

            // 그 외의 경우 (방 나가기 등) Janus 연결 정리
            console.log('🧹 Janus 연결 정리');
            if (janusRef.current) {
                janusRef.current.destroy();
                janusRef.current = null;
            }
            // [병합] '내 브랜치'의 컨텍스트 상태도 초기화
            pluginHandleRef.current = null;
            remoteFeedsRef.current = {};
            userIdToFeedIdRef.current = {};
            setIsJanusConnected(false);
            setRemoteStreams({}); // 스트림 정보 초기화
        };
    }, [myUserId, participants.length, roomId, isWebcamOn, stream, janusRef, pluginHandleRef, remoteFeedsRef, userIdToFeedIdRef, setIsJanusConnected, setRemoteStreams]); // [병합] Context에서 가져온 state setter들도 의존성에 추가

    // 원격 스트림을 video 엘리먼트에 연결 (양쪽 브랜치 동일)
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
    // [병합] '내 브랜치'의 handleRoomJoin (useAuthStore 기반)
    const handleRoomJoin = (data) => {
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
                isMe: p.userId === myUserId, // useAuthStore의 myUserId와 비교
                isHost: p.host,
                isReady: p.ready,
                webcamStatus: 'off'
            }));

            console.log('✅ formattedParticipants:', formattedParticipants);
            setParticipants(formattedParticipants);
            console.log('✅ setParticipants 호출 완료');

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

    // [병합] 'dev'와 '내 브랜치'의 handleParticipantEvent 병합
    const handleParticipantEvent = (data) => {
        console.log('📥 참가자 이벤트:', data);

        if (!data.success) return;

        const eventData = data.data;

        switch (eventData.eventType) {
            case 'PARTICIPANT_JOINED': {
                const newUser = eventData.participant;
                console.log('🚪 새 참가자 입장:', newUser);

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

                setRoomInfo(prev => ({
                    ...prev,
                    currentParticipants: eventData.currentParticipants
                }));
                break;
            }

            case 'PARTICIPANT_LEFT':
                console.log('👋 참가자 퇴장:', eventData.participant);
                // [병합] 'dev'의 방 종료 로직 (AlertModal 표시)
                if (eventData.roomClosed) {
                    console.log('🚪 방장이 나가 방이 종료됨');
                    setShowRoomClosedAlert(true);
                    return; // navigate 대신 모달 표시
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

                setParticipants(prev =>
                    prev.map(p =>
                        p.userId === eventData.userId
                            ? { ...p, isReady: updatedReady }
                            : p
                    )
                );
                break;
            }

            // [병합] 'dev'의 ROOM_CLOSED 이벤트 케이스 추가
            case 'ROOM_CLOSED':
                console.log('🚪 방 종료 (이벤트 수신):', eventData);
                setShowRoomClosedAlert(true);
                break;

            default:
                console.log('알 수 없는 이벤트:', eventData.eventType);
        }
    };

    // [병합] '내 브랜치'의 개선된 handleError (ROOM_ALREADY_STARTED 처리)
    const handleError = (data) => {
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
    };

    // [병합] '내 브랜치'의 handleGameStart (WebSocket 이벤트 핸들러)
    // (dev의 handleStartGame(클릭 핸들러)와 이름이 겹쳤었음, dev의 핸들러는 삭제)
    const handleGameStart = (data) => {
        console.log('📥📥📥 게임 시작 응답 RAW:', JSON.stringify(data, null, 2));

        if (data.success) {
            const gameData = data.data;
            console.log('✅ 게임 시작 - 게임 페이지로 이동');

            // [병합] '내 브랜치'의 핵심 로직: 네비게이션 플래그 설정
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

            console.log('전달할 state:', JSON.stringify(stateToPass, null, 2));
            navigate(`/quiz/game/${roomId}`, { state: stateToPass });
        } else {
            console.error('❌ 게임 시작 실패:', data.message);
            alert(data.message || '게임 시작에 실패했습니다.');
        }
    };

    // 웹캠 상태 변경 시 내 정보 업데이트 (양쪽 브랜치 동일)
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

    // 참가자 준비 상태 변경 시 allReady 계산 (양쪽 브랜치 동일)
    useEffect(() => {
        const nonHostParticipants = participants.filter(p => !p.isHost);
        const allNonHostReady = nonHostParticipants.length > 0 &&
            nonHostParticipants.every(p => p.isReady);

        console.log('🔍 준비 상태 체크:', {
            nonHostCount: nonHostParticipants.length,
            allReady: allNonHostReady,
        });

        setAllReady(allNonHostReady);
    }, [participants]);


    // 웹캠 권한 요청
    const handleWebcamRequest = async () => {
        try {
            // [병합] '내 브랜치'의 useWebcamStore 사용
            await startWebcam();
        } catch (error) {
            console.error('웹캠 권한 거부:', error);
        }
    };

    // 내 정보
    const me = participants.find(p => p.userId === myUserId);
    const isHost = me?.isHost || false;
    const isReady = me?.isReady || false;

    // 준비 상태 토글 (양쪽 브랜치 동일)
    const handleReadyToggle = () => {
        const toggledReady = !isReady;
        setParticipants((prevParticipants) =>
            prevParticipants.map((p) =>
                p.userId === myUserId ? { ...p, isReady: toggledReady } : p
            )
        );
        websocketService.setReady(Number(roomId), toggledReady);
        console.log(`✅ 준비 상태 전송됨: ${toggledReady}`);
    };

    // [병합] '내 브랜치'의 handleStartGame (버튼 클릭 핸들러)
    // (dev의 단순 navigate 로직 대신 WS 전송 로직 사용)
    const handleStartGame = () => {
        try {
            console.log('🎮 게임 시작 요청 전송 - roomId:', roomId);
            websocketService.startGame(Number(roomId)); // 서버로 게임 시작 요청
        } catch (error) {
            console.error('❌ 게임 시작 요청 실패:', error);
            alert('게임 시작 요청에 실패했습니다: ' + error.message);
        }
    };

    // [병합] 'dev'의 cleanupAndExit 함수 (방 나가기 공통 처리)
    // (단, '내 브랜치'의 Context/Store를 사용하도록 수정)
    const cleanupAndExit = async () => {
        try {
            console.log('🚪 방 나가기 처리 시작 (Merged)');

            // 1. Janus WebRTC 정리 (Context 사용)
            if (janusRef.current) {
                try {
                    janusRef.current.destroy();
                    janusRef.current = null;
                    pluginHandleRef.current = null;
                    remoteFeedsRef.current = {};
                    userIdToFeedIdRef.current = {};
                    setIsJanusConnected(false);
                    setRemoteStreams({}); // Context의 스트림 초기화
                    console.log('✅ Janus 정리 완료');
                } catch (error) {
                    console.error('Janus 정리 실패:', error);
                }
            }

            // 2. 웹캠 정리 (useWebcamStore 사용)
            if (isWebcamOn) {
                stopWebcam(); // '내 브랜치'의 스토어 함수 호출
                console.log('✅ 웹캠 정리 완료 (via store)');
            }

            // 3. WebSocket 연결 해제
            websocketService.disconnect();
            console.log('✅ WebSocket 연결 해제 완료 (서버가 자동으로 퇴장 처리)');

            // 4. 메인 페이지로 이동
            navigate('/main');
        } catch (error) {
            console.error('❌ 방 나가기 실패:', error);
            navigate('/main'); // 실패 시에도 강제 이동
        }
    };

    // 나가기 버튼 클릭
    const handleExit = () => {
        setShowExitModal(true);
    };

    // [병합] 'dev'의 confirmExit (cleanupAndExit 호출)
    const confirmExit = () => {
        cleanupAndExit();
    };

    // [병합] 'dev'의 방 종료 알림 닫기 핸들러
    const handleRoomClosedAlertClose = () => {
        cleanupAndExit(); // 모달 닫을 때도 cleanup
    };


    // 웹캠 상태 아이콘/텍스트 (양쪽 브랜치 동일)
    const getWebcamStatusColor = (status) => {
        switch (status) {
            case 'on': return 'var(--info-color)';
            case 'off': return '#999999';
            case 'denied': return 'var(--error-color)';
            default: return '#999999';
        }
    };

    const getWebcamStatusText = (status) => {
        switch (status) {
            case 'on': return 'CAM ON';
            case 'off': return 'CAM OFF';
            case 'denied': return 'CAM DENIED';
            default: return 'CAM OFF';
        }
    };

    // ============================================
    // 렌더링 (JSX)
    // [병합] '내 브랜치'의 JSX를 기준으로 'dev'의 AlertModal 추가
    // ============================================
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
                        // [병합] '내 브랜치'의 스토어 함수 사용
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
                                    // [병합] '내 브랜치'의 handleStartGame(WS 전송) 사용
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
                            <div
                                className={styles.camStatusDot}
                                style={{ backgroundColor: getWebcamStatusColor(participant.webcamStatus) }}
                                title={getWebcamStatusText(participant.webcamStatus)}
                            ></div>

                            {participant.isHost && (
                                <span className={styles.hostBadge}>방장</span>
                            )}

                            <div className={styles.webcamArea}>
                                {participant.userId === myUserId && isWebcamOn ? (
                                    <video
                                        ref={videoRef} // [병합] '내 브랜치'의 로컬 videoRef
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

                            <div className={styles.participantInfo}>
                <span className={styles.nickname}>
                  {participant.nickname}{participant.userId === myUserId ? ' (나)' : ''}
                </span>
                                <span className={styles.score}>{participant.score}점</span>
                            </div>

                            {!participant.isHost && (
                                <div
                                    className={`${styles.readyBadge} ${participant.isReady ? styles.ready : styles.notReady
                                    }`}
                                >
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
                            {/* [병합] 'dev'의 cleanup 로직이 포함된 confirmExit 호출 */}
                            <button className={styles.confirmButton} onClick={confirmExit}>
                                나가기
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* [병합] 'dev'의 방 종료 알림 모달 추가 */}
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