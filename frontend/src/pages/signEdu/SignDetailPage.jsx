// SignDetailPage.jsx (임시 테스트 버전)
// WebRTC 로직을 모두 제거하고 WebSocket 연결 및 인증만 테스트합니다.

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// --- 환경 변수 사용 ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const WS_BASE_URL = import.meta.env.VITE_WS_URL;

const SignDetailPage = () => {
    const { signId } = useParams();

    // --- Page State & Refs ---
    const [signDetail, setSignDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const targetVideoRef = useRef(null);

    // --- Learning Connection State ---
    const [isWebcamActive, setIsWebcamActive] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('비활성화됨');
    const localVideoRef = useRef(null);

    // DTO 필드에 맞춘 변수 (백엔드 SignDetailResponseDto 필드명 사용)
    // SignDetailResponseDto { signId, wordName, description, videoUrl }
    const wordPk = signDetail?.signId ?? signDetail?.id ?? signDetail?.wordId;
    const wordName = signDetail?.wordName ?? signDetail?.title ?? signDetail?.name ?? '';

    // description / video url (백엔드 필드명 우선, 기존 프론트의 다른 이름에 대한 페일백 유지)
    const descriptionText = signDetail?.description ?? signDetail?.desc ?? '';
    const videoUrl = signDetail?.videoUrl ?? signDetail?.url ?? '';
    const sessionIdRef = useRef(null);
    const wsRef = useRef(null);

    // 브라우저 환경에서 안전하게 ws/wss URL을 생성하는 헬퍼
    const buildWebSocketUrl = (sessionId) => {
        if (!sessionId) return null;
        if (WS_BASE_URL?.startsWith('ws://') || WS_BASE_URL?.startsWith('wss://')) {
            return `${WS_BASE_URL.replace(/\/+$/,'')}/${sessionId}`;
        }
        if (WS_BASE_URL?.startsWith('http://') || WS_BASE_URL?.startsWith('https://')) {
            const proto = WS_BASE_URL.startsWith('https://') ? 'wss' : 'ws';
            const hostAndPath = WS_BASE_URL.replace(/^https?:\/\//, '').replace(/\/+$/,'');
            return `${proto}://${hostAndPath}/${sessionId}`;
        }
        const proto = (typeof window !== 'undefined' && window.location?.protocol === 'https:') ? 'wss' : 'ws';
        const host = (typeof window !== 'undefined') ? window.location.host : 'localhost:9000';
        const base = WS_BASE_URL ? WS_BASE_URL.replace(/^\/+|\/+$/g, '') : 'ws';
        return `${proto}://${host}/${base}/${sessionId}`.replace(/\/+/g, '/').replace(':/','://');
    };

    // 1. 데이터 로드 로직
    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE_URL}/api/sign-edu/${signId}`, {
                    // 쿠키 기반 인증을 위해 withCredentials 옵션 추가
                    withCredentials: true
                });
                setSignDetail(response.data);
            } catch (err) {
                console.error("단어 상세 정보 API 호출 실패:", err);
                setError("단어 상세 정보를 불러오는 데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [signId]);

    // 2. [수정됨] WebSocket 연결 로직 (WebRTC 없음)
    useEffect(() => {
        if (!isWebcamActive || !wordPk || !wordName || !sessionIdRef.current) return;

        let stream = null;

        const setupWebcamAndConnect = async () => {
            try {
                setConnectionStatus('웹캠 연결 중...');
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                // 웹캠 성공 시 바로 WebSocket 연결 시도
                connectToFastAPIServer();

            } catch (err) {
                console.error("Error accessing media devices:", err);
                setConnectionStatus('웹캠 연결 실패');
                setError("웹캠 접근 권한이 거부되었습니다. 카메라를 활성화해 주세요.");
            }
        };

        const connectToFastAPIServer = async () => {
            setConnectionStatus('WebSocket 연결 중...');
            const wsUrl = buildWebSocketUrl(sessionIdRef.current);
            if (!wsUrl) {
                console.error('WebSocket URL을 생성할 수 없습니다. sessionId:', sessionIdRef.current);
                setConnectionStatus('WebSocket URL 생성 실패');
                return;
            }

            try {
                if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
                    wsRef.current.close();
                }
            } catch (e) {
                console.warn('기존 WebSocket 닫기 실패:', e);
            }

            try {
                wsRef.current = new WebSocket(wsUrl);
            } catch (err) {
                console.error('WebSocket 객체 생성 실패:', err);
                setConnectionStatus('WebSocket 생성 실패');
                return;
            }

            // [수정됨] onopen: WebRTC 대신 'meta' 메시지를 바로 전송
            wsRef.current.onopen = () => {
                console.log('✅✅✅ WebSocket 연결 성공! ✅✅✅');
                setConnectionStatus('WebSocket 연결 성공 (인증 완료)');

                console.log("테스트: 'meta' 메시지 전송 시도...");
                wsRef.current.send(JSON.stringify({
                    type: "meta",
                    word_pk: wordPk,
                    word_name: wordName,
                }));
            };

            // [수정됨] onmessage: 'meta_ack' 수신 확인
            wsRef.current.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'meta_ack') {
                        console.log('✅✅✅ 서버로부터 "meta_ack" 수신! 완벽한 성공입니다.');
                        setConnectionStatus('연결 완료! (테스트 성공)');
                    } else {
                        console.log("서버로부터 기타 메시지 수신:", msg);
                    }
                } catch (e) {
                    console.warn('WebSocket 수신 메시지 파싱 실패:', e, event.data);
                }
            };

            wsRef.current.onerror = (e) => {
                console.error('WebSocket error:', e);
                setConnectionStatus('WebSocket 연결 실패');
            };

            // [수정됨] onclose: 에러 코드 상세 로깅
            wsRef.current.onclose = (ev) => {
                console.info('WebSocket closed:', ev);
                if (ev.code === 1006) {
                    console.error("❌ 1006 에러: SSL/TLS 인증서 신뢰 문제. 브라우저가 연결을 거부했습니다. [1단계]를 다시 수행하세요.");
                    setConnectionStatus('WebSocket 실패 (1006: 인증서)');
                } else if (ev.code >= 4000 || ev.code === 1008) {
                    console.error(`❌ ${ev.code} 에러: 인증 실패 (401/403). JWT 시크릿 키 또는 쿠키 설정을 확인하세요.`);
                    setConnectionStatus(`WebSocket 실패 (${ev.code}: 인증)`);
                } else if (!isWebcamActive) {
                    setConnectionStatus('비활성화됨');
                } else {
                    setConnectionStatus('WebSocket 연결 종료');
                }
            };
        };

        setupWebcamAndConnect();

        // 정리 함수
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            wsRef.current?.close();
            setConnectionStatus('비활성화됨');
        };
    }, [isWebcamActive, wordPk, wordName]);


    // 2-5. 데이터 제공 시작 핸들러
    const handleStartLearning = () => {
        if (!signDetail) return;
        sessionIdRef.current = `learning_${wordPk || 'pending'}_${Date.now()}`;
        setIsWebcamActive(true);
    };

    // 3. 렌더링 (View)
    // [수정됨] '녹화 시작' 버튼 비활성화 (테스트용)
    const isButtonDisabled = true;

    if (loading) return <div className="p-5 text-center text-gray-600">단어 상세 정보를 불러오는 중입니다...</div>;
    if (error) return <div className="p-5 text-center text-red-600">{error}</div>;
    if (!signDetail) return <div className="p-5 text-center text-gray-600">단어 정보를 찾을 수 없습니다.</div>;

    return (
        <div className="p-5">
            <h1 className="text-2xl font-bold mb-4">{wordName || '단어 상세'}</h1>
            {descriptionText ? (
                <p className="mb-3">{descriptionText}</p>
            ) : (
                <p className="mb-3 text-gray-500">설명이 없습니다.</p>
            )}

            <div className="flex gap-6 mb-4">
                <div>
                    <div className="mb-2">로컬 웹캠</div>
                    <video ref={localVideoRef} autoPlay muted playsInline style={{ width: 320, background: '#000' }} />
                </div>
                <div>
                    <div className="mb-2">참조 비디오</div>
                    {videoUrl ? (
                        <video ref={targetVideoRef} src={videoUrl} controls style={{ width: 320 }} />
                    ) : (
                        <div className="w-[320px] h-[180px] bg-gray-100 flex items-center justify-center">비디오 없음</div>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <div className="mb-2">상태: <strong>{connectionStatus}</strong></div>
            </div>

            <div className="flex gap-3">
                <button
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                    onClick={() => {
                        if (!isWebcamActive) handleStartLearning();
                        else setIsWebcamActive(false);
                    }}
                >
                    {isWebcamActive ? '웹캠 중지' : '웹캠 시작'}
                </button>

                <button
                    className={`px-4 py-2 rounded ${isButtonDisabled ? 'bg-gray-400 text-gray-700' : 'bg-green-600 text-white'}`}
                    disabled={isButtonDisabled}
                >
                    (연결 테스트 중)
                </button>
            </div>
        </div>
    );
};

export default SignDetailPage;
