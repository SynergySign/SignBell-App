import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- 설정 변수 ---
const JANUS_SERVER = "https://janus.jsflux.co.kr/janus";
const ROOM_ID = 1234;
const FASTAPI_WS_URL = `/api/ws`;
const FRAME_RATE_MS = 1000 / 25;

const GameRoom = () => {
    // --- 상태 관리 ---
    const [myUsername] = useState(`user_${Date.now()}`);
    const [participants, setParticipants] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [inferenceResult, setInferenceResult] = useState(null);
    const [countdown, setCountdown] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState({ janus: '라이브러리 로딩 중...', fastAPI: '대기 중...' });
    const [isJanusReady, setIsJanusReady] = useState(false);

    // --- Ref 관리 ---
    const janusRef = useRef(null);
    const videoRoomHandleRef = useRef(null);
    const localStreamRef = useRef(null);
    const myVideoRef = useRef(null);
    const wsRef = useRef(null);
    const pcRef = useRef(null);
    const dataChannelRef = useRef(null);
    const frameIntervalRef = useRef(null);
    const remoteFeedHandlesRef = useRef({});

    // --- 스크립트 동적 로딩 로직 ---
    useEffect(() => {
        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) {
                    return resolve();
                }
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Script load error for ${src}`));
                document.head.appendChild(script);
            });
        };

        const loadJanusScripts = async () => {
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/webrtc-adapter/8.2.3/adapter.min.js');
                console.log("adapter.js dynamically loaded.");

                await loadScript('/janus.js');
                console.log("janus.js dynamically loaded.");

                if (window.Janus) {
                    setIsJanusReady(true);
                } else {
                    throw new Error("window.Janus is not available after script load.");
                }
            } catch (error) {
                console.error("Failed to load Janus scripts:", error);
                setConnectionStatus(prev => ({...prev, janus: '라이브러리 로드 실패'}));
            }
        };

        loadJanusScripts();

        return () => {
            janusRef.current?.destroy();
            wsRef.current?.close();
            pcRef.current?.close();
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        };
    }, []);

    // --- Janus 초기화 로직 ---
    useEffect(() => {
        if (isJanusReady) {
            setConnectionStatus(prev => ({...prev, janus: '라이브러리 로드 완료. 초기화 시작...'}));
            window.Janus.init({
                debug: "all",
                callback: connectToJanus,
            });
        }
    }, [isJanusReady]);

    const connectToJanus = () => {
        if (!window.Janus.isWebrtcSupported()) {
            alert("WebRTC is not supported.");
            return;
        }
        setConnectionStatus(prev => ({...prev, janus: '세션 생성 중...'}));
        janusRef.current = new window.Janus({
            server: JANUS_SERVER,
            success: attachToVideoRoomPlugin,
            error: (err) => {
                console.error("Janus session failed:", err);
                setConnectionStatus(prev => ({...prev, janus: '세션 생성 실패'}));
            },
        });
    };

    const attachToVideoRoomPlugin = () => {
        janusRef.current.attach({
            plugin: "janus.plugin.videoroom",
            success: (pluginHandle) => {
                console.log("Janus 플러그인 연결 성공!");
                setConnectionStatus(prev => ({...prev, janus: '플러그인 연결됨'}));
                videoRoomHandleRef.current = pluginHandle;

                const joinMsg = { request: "join", room: ROOM_ID, ptype: "publisher", display: myUsername };
                pluginHandle.send({ message: joinMsg });
            },
            error: (err) => {
                console.error("Plugin attach failed:", err);
                setConnectionStatus(prev => ({...prev, janus: '플러그인 연결 실패'}));
            },
            onlocalstream: (stream) => {
                console.log("카메라 스트림을 성공적으로 받았습니다!");
                setConnectionStatus(prev => ({...prev, janus: '연결 완료!'}));
                localStreamRef.current = stream;
                if(myVideoRef.current) {
                    window.Janus.attachMediaStream(myVideoRef.current, stream);
                }
                connectToFastAPIServer();
            },
            onmessage: (msg, jsep) => {
                const handle = videoRoomHandleRef.current;
                if (!handle) return;

                const event = msg["videoroom"];
                if (event) {
                    if (event === "joined") {
                        console.log("Janus 방에 참여했습니다. 카메라를 켭니다.");
                        handle.createOffer({
                            media: { audioSend: false, videoSend: true },
                            success: (jsep) => {
                                const publish = { request: "configure", audio: false, video: true };
                                handle.send({ message: publish, jsep: jsep });
                            },
                            error: (err) => console.error("Janus createOffer error:", err)
                        });

                        if (msg["publishers"]) {
                            console.log("이미 방에 있는 참가자들을 구독합니다.", msg["publishers"]);
                            msg["publishers"].forEach(publisher => {
                                // 🔥 자기 자신은 구독하지 않음
                                if (publisher.display !== myUsername) {
                                    subscribeToRemoteFeed(publisher.id, publisher.display);
                                } else {
                                    console.log('⏭️ 자기 자신은 구독 스킵 - display:', publisher.display);
                                }
                            });
                        }
                    } else if (event === "event") {
                        if (msg["publishers"]) {
                            console.log("새로운 참가자를 구독합니다.", msg["publishers"]);
                            msg["publishers"].forEach(publisher => {
                                // 🔥 자기 자신은 구독하지 않음
                                if (publisher.display !== myUsername) {
                                    subscribeToRemoteFeed(publisher.id, publisher.display);
                                } else {
                                    console.log('⏭️ 자기 자신은 구독 스킵 - display:', publisher.display);
                                }
                            });
                        }
                        else if (msg["leaving"] || msg["unpublished"]) {
                            const leavingId = msg["leaving"] || msg["unpublished"];
                            console.log(`참가자(ID: ${leavingId})가 나갔습니다.`);
                            const remoteHandle = remoteFeedHandlesRef.current[leavingId];
                            if (remoteHandle) {
                                remoteHandle.detach();
                                delete remoteFeedHandlesRef.current[leavingId];
                            }
                            setParticipants(prev => prev.filter(p => p.id !== leavingId));
                        }
                    }
                }
                if (jsep) {
                    handle.handleRemoteJsep({ jsep: jsep });
                }
            }
        });
    };

    const subscribeToRemoteFeed = (feedId, displayName) => {
        if (remoteFeedHandlesRef.current[feedId]) return;

        let remoteFeedHandle = null;
        janusRef.current.attach({
            plugin: "janus.plugin.videoroom",
            success: (pluginHandle) => {
                remoteFeedHandle = pluginHandle;
                remoteFeedHandlesRef.current[feedId] = remoteFeedHandle;
                console.log(`[${displayName}]의 피드를 구독합니다. (handleId: ${pluginHandle.getId()})`);

                const subscribeMsg = { request: "join", room: ROOM_ID, ptype: "subscriber", feed: feedId };
                remoteFeedHandle.send({ message: subscribeMsg });
            },
            error: (error) => console.error(`[${displayName}] 피드 구독 실패:`, error),
            onmessage: (msg, jsep) => {
                if (jsep) {
                    remoteFeedHandle.createAnswer({
                        jsep: jsep,
                        media: { audioSend: false, videoSend: false },
                        success: (jsep) => {
                            const startMsg = { request: "start", room: ROOM_ID };
                            remoteFeedHandle.send({ message: startMsg, jsep: jsep });
                        },
                        error: (error) => console.error("createAnswer 에러:", error)
                    });
                }
            },
            onremotestream: (stream) => {
                console.log(`[${displayName}]의 영상 스트림을 받았습니다.`);
                setParticipants(prev => {
                    if (prev.find(p => p.id === feedId)) return prev;
                    return [...prev, { id: feedId, displayName, stream }];
                });
            }
        });
    };

    const connectToFastAPIServer = useCallback(() => {
        setConnectionStatus(prev => ({...prev, fastAPI: '연결 중...'}));
        const sessionId = myUsername;

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}${FASTAPI_WS_URL}/${sessionId}`;

        console.log(`Connecting to FastAPI WebSocket: ${wsUrl}`);
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
            console.log("FastAPI WebSocket connected. Setting up PeerConnection.");
            setConnectionStatus(prev => ({...prev, fastAPI: 'WebSocket 연결됨'}));
            setupPeerConnection();
        };

        wsRef.current.onmessage = async (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'answer' && pcRef.current) {
                console.log("Received answer from FastAPI.");
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg));
            } else if (msg.type === 'inference_result') {
                console.log("AI Result:", msg.data);
                setInferenceResult(msg.data);
                setIsStreaming(false);
            }
        };
        wsRef.current.onerror = (err) => {
            console.error("FastAPI WebSocket error:", err);
            setConnectionStatus(prev => ({...prev, fastAPI: 'WebSocket 연결 실패'}));
        }
    }, [myUsername]);

    const setupPeerConnection = async () => {
        pcRef.current = new RTCPeerConnection();
        dataChannelRef.current = pcRef.current.createDataChannel("frames");

        dataChannelRef.current.onopen = () => {
            console.log("DataChannel to FastAPI is open.");
            setConnectionStatus(prev => ({...prev, fastAPI: '연결 완료!'}));
        };
        dataChannelRef.current.onclose = () => {
            console.log("DataChannel to FastAPI is closed.");
            setConnectionStatus(prev => ({...prev, fastAPI: '연결 끊어짐'}));
        };

        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);

        wsRef.current.send(JSON.stringify({
            action: "offer",
            sdp: pcRef.current.localDescription.sdp,
            type: pcRef.current.localDescription.type
        }));
    };

    const sendFrame = useCallback(() => {
        const dc = dataChannelRef.current;
        if (!dc || dc.readyState !== 'open' || !myVideoRef.current) return;

        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(myVideoRef.current, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (blob && dc.readyState === 'open') {
                try {
                    dc.send(await blob.arrayBuffer());
                } catch (e) {
                    console.error("DC send error:", e);
                }
            }
        }, "image/jpeg", 0.7);
    }, []);

    const startStreaming = useCallback(() => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            alert("FastAPI 서버와 연결되지 않았습니다.");
            return;
        }
        setIsStreaming(true);
        setInferenceResult(null);
        dataChannelRef.current.send("reset");
        frameIntervalRef.current = setInterval(sendFrame, FRAME_RATE_MS);

        setTimeout(() => {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
                if (dataChannelRef.current.readyState === 'open') {
                    dataChannelRef.current.send("flush");
                }
                console.log("Streaming finished. Requested inference.");
            }
        }, 5000);
    }, [sendFrame]);

    const startCountdown = () => {
        setCountdown(3);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    startStreaming();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    return (
        <div>
            <h1>SignBell 수어 퀴즈방 (실시간 스트리밍 테스트)</h1>
            <div>
                <p><strong>Janus 연결 상태:</strong> {connectionStatus.janus}</p>
                <p><strong>FastAPI 연결 상태:</strong> {connectionStatus.fastAPI}</p>
                <hr/>
                <p><strong>AI 예측 결과:</strong> {inferenceResult ? JSON.stringify(inferenceResult) : '대기 중...'}</p>
                {countdown > 0 && <h2>{countdown}</h2>}
                {isStreaming && <p><strong>스트리밍 중... (5초)</strong></p>}
            </div>
            <button
                onClick={startCountdown}
                disabled={isStreaming || connectionStatus.fastAPI !== '연결 완료!'}
            >
                테스트 스트리밍 시작
            </button>
            <hr />
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <div style={{ margin: '10px', border: '2px solid blue' }}>
                    <h3>{myUsername} (나)</h3>
                    <video ref={myVideoRef} autoPlay playsInline muted style={{ width: '320px' }} />
                </div>
                {participants.map(p => (
                    <div key={p.id} style={{ margin: '10px', border: '1px solid grey' }}>
                        <h3>{p.displayName}</h3>
                        <video
                            ref={videoEl => {
                                if (videoEl && p.stream) {
                                    window.Janus.attachMediaStream(videoEl, p.stream);
                                }
                            }}
                            autoPlay
                            playsInline
                            style={{ width: '320px' }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GameRoom;