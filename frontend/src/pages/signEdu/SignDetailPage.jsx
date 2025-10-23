// SignDetailPage.jsx
// 단일 수어 단어의 상세 정보(제목, 설명, 동영상)를 보여줍니다.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignDetail } from '../../services/signedu/signEdu.js';
import useSignEduWebcam from '../../services/signedu/signEduWebcam.js';
import {
  connect as wsConnect,
  disconnect as wsDisconnect,
  sendMeta as wsSendMeta,
  sendFrame as wsSendFrame,
  sendSaveLearning as wsSendSaveLearning,
  sendFlush as wsSendFlush,
  onStatus as wsOnStatus,
  onMessage as wsOnMessage,
  getStatus as wsGetStatus,
  SESSION_ID as WS_SESSION_ID,
} from '../../services/signedu/signEduWebSocket';

// 안전한 URL 변환: 페이지가 HTTPS인 경우 http:// -> https://로 변환하여 Mixed Content 경고를 방지
const sanitizeVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  try {
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:') {
      if (url.startsWith('http://')) {
        return 'https:' + url.slice(5); // http:// -> https://
      }
    }
  } catch {
    // 안전하게 실패하면 원본 URL 반환
    return url;
  }
  return url;
};

const SignDetailPage = () => {
  const { signId } = useParams();
  const navigate = useNavigate();

  const [signDetail, setSignDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 웹캠 훅 사용: start/stop, 장치목록, 선택 deviceId, videoRef 등 제공
  const {
    isCamOn,
    camError,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    videoRef,
    startCamera,
    stopCamera,
    refreshDevices,
  } = useSignEduWebcam();

  useEffect(() => {
    if (!signId) {
      setError('유효한 단어 ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    // 서비스로 분리된 API 호출 사용
    (async () => {
      try {
        const dto = await getSignDetail(signId);
        setSignDetail(dto);
      } catch (err) {
        console.error('SignDetail API 호출 실패:', err);
        setError('단어 상세 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [signId]);

  if (loading) return <div className="p-5 text-center text-gray-600">단어 정보를 불러오는 중...</div>;
  if (error) return <div className="p-5 text-center text-red-500 font-bold">오류: {error}</div>;
  if (!signDetail) return <div className="p-5 text-center text-gray-500">단어 정보가 없습니다.</div>;

  // 렌더 시 비디오 URL을 안전하게 변환하여 Mixed Content 경고를 방지
  const safeVideoUrl = sanitizeVideoUrl(signDetail.videoUrl);

  return (
    <div className="p-5 max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
      >
        &larr; 뒤로
      </button>

      <h1 className="text-3xl font-bold mb-4 text-indigo-700">{signDetail.wordName}</h1>

      <div className="mb-6 text-gray-700 whitespace-pre-line">{signDetail.description || '상세 설명이 없습니다.'}</div>

      {safeVideoUrl ? (
        <div className="mb-6">
          <video controls style={{ width: '100%', maxHeight: '60vh' }}>
            <source src={safeVideoUrl} />
            현재 브라우저는 video 태그를 지원하지 않습니다.
          </video>
        </div>
      ) : (
        <div className="text-center text-gray-500">동영상이 없습니다.</div>
      )}

      {/* 웹캠 연결 UI */}
      <div className="mt-4 p-4 border rounded bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-medium">웹캠</div>
          <div>
            <button
              onClick={() => {
                if (isCamOn) stopCamera();
                else startCamera();
              }}
              className={`px-3 py-2 rounded-lg text-white ${isCamOn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isCamOn ? '웹캠 연결 끊기' : '웹캠 연결하기'}
            </button>
          </div>
        </div>

        {camError && <div className="text-sm text-red-500 mb-2">{camError}</div>}

        {/* 장치 선택 및 재시도 버튼 */}
        <div className="flex items-center gap-2 mb-3">
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-2 py-1 border rounded"
          >
            <option value="">기본(전면) 카메라</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || '카메라 ' + (devices.indexOf(d) + 1)}</option>
            ))}
          </select>

          <button
            onClick={async () => {
              // 먼저 기존 스트림 정리
              stopCamera();
              // 잠시 대기 후 재시도
              setTimeout(() => startCamera(selectedDeviceId || undefined), 300);
            }}
            className="px-3 py-1 bg-yellow-500 text-white rounded"
          >
            재시도
          </button>

          <button
            onClick={async () => {
              // 장치 목록 갱신
              await refreshDevices();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            장치 목록 갱신
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-2">내 카메라 미리보기</div>
            <div className="bg-black rounded overflow-hidden" style={{ minHeight: 180 }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 웹소켓 / 녹화 제어 UI */}
      <div className="mt-6 p-4 border rounded bg-white">
        <WebSocketControl
          signDetail={signDetail}
          videoRef={videoRef}
          isCamOn={isCamOn}
          wsGetStatus={wsGetStatus}
        />
      </div>
    </div>
  );
};

// 웹소켓 및 녹화 제어를 담당하는 내부 컴포넌트
function WebSocketControl({ signDetail, videoRef, isCamOn, wsGetStatus }) {
  const [wsStatus, setWsStatus] = useState(wsGetStatus());
  const [serverFeedback, setServerFeedback] = useState('');
  const [wsMessages, setWsMessages] = useState([]);

  // --- ⬇️ 수정된 부분 1: 'ref'를 사용하여 루프 상태 관리 ---
  const canvasRef = useRef(null);
  const recordingLoopRef = useRef(null); // requestAnimationFrame의 ID
  const isRecordingRef = useRef(false); // 실제 녹화 상태 (state 대신 ref 사용)

  // UI 표시는 state로 계속 관리
  const [isRecordingUI, setIsRecordingUI] = useState(false);
  // --- ⬆️ 수정 완료 ⬆️ ---

  // 메시지 핸들러 (기존과 동일)
  useEffect(() => {
    const offStatus = wsOnStatus((s) => setWsStatus(s));
    const offMsg = wsOnMessage((m) => {
      setWsMessages((prev) => [...prev, m]);
      // 간단한 타입 기반 처리
      if (m && m.type === 'meta_ack') {
        setServerFeedback('✅ 서버와 연결되었습니다. (Meta Ack)');
      } else if (m && m.type === 'learning_ack') {
        if (m.status === 'accepted') setServerFeedback('✅ 학습 데이터가 성공적으로 저장되었습니다.');
        else setServerFeedback(`❌ 저장 실패: ${m.reason || '알 수 없는 오류'}`);
      } else if (m && m.type === 'inference_result') {
        const result = m.result || {};
        const scorePercent = result.score ? (result.score * 100).toFixed(1) : '0.0';
        setServerFeedback(`💡 예측 결과: ${result.predicted || 'N/A'} (신뢰도: ${scorePercent}%)`);
      }
    });

    return () => {
      offStatus();
      offMsg();
    };
  }, []);

  // 웹소켓 생명주기 (기존과 동일)
  useEffect(() => {
    if (signDetail && isCamOn) {
      wsConnect();
      const offStatusLocal = wsOnStatus((status) => {
        setWsStatus(status);
        if (status === 'Connected') {
          try {
            wsSendMeta({ word_pk: signDetail.signId, word_name: signDetail.wordName });
          } catch (e) {
            console.error('sendMeta 호출 오류:', e);
            setServerFeedback(`sendMeta error: ${e.message}`);
          }
        }
      });

      return () => {
        offStatusLocal();
        wsDisconnect();
      };
    } else if (!isCamOn) {
      wsDisconnect();
      setWsStatus(wsGetStatus());
    }
  }, [signDetail, isCamOn, wsGetStatus]);

  // --- ⬇️ 수정된 부분 2: 'captureAndSendFrame' 함수 수정 ---
  const captureAndSendFrame = useCallback(() => {
    // state(isRecording) 대신 ref(isRecordingRef)를 확인
    if (!isRecordingRef.current) {
      console.log('[Capture Loop] Loop stopping (isRecordingRef is false).');
      return; // 루프 중단
    }

    if (!canvasRef.current || !videoRef.current) {
      console.error('[Capture Loop] Ref check failed.');
      isRecordingRef.current = false; // 루프 중단
      setIsRecordingUI(false); // UI 업데이트
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      if (vw === 0 || vh === 0) {
        console.warn(`[Capture Loop] Video dimensions are 0. Retrying...`);
        // 비디오가 준비 안 됨. 다음 프레임에서 재시도
        recordingLoopRef.current = requestAnimationFrame(captureAndSendFrame);
        return;
      }

      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          // 이 로그가 보여야 합니다!
          console.log(`[Capture] toBlob Succeeded. Sending frame size: ${blob.size}`);
          wsSendFrame(blob);
        }

        // ref를 다시 확인하여 루프 지속
        if (isRecordingRef.current) {
          recordingLoopRef.current = requestAnimationFrame(captureAndSendFrame);
        }
      }, 'image/jpeg', 0.8);
    } catch (e) {
      console.error('captureAndSendFrame error:', e);
      isRecordingRef.current = false; // 오류 시 루프 중단
      setIsRecordingUI(false); // UI 업데이트
    }
  }, [videoRef]); // 의존성 배열에서 'isRecording' 제거 (중요!)
  // --- ⬆️ 수정 완료 ⬆️ ---

  // --- ⬇️ 수정된 부분 3: 버튼 핸들러 수정 ---
  const handleStartRecording = () => {
    if (wsStatus !== 'Connected') {
      alert('웹소켓이 연결되지 않았습니다. 웹캠을 껐다 켜보세요.');
      return;
    }
    isRecordingRef.current = true; // Ref를 true로 설정
    setIsRecordingUI(true); // UI State를 true로 설정
    setServerFeedback('녹화 시작...');

    // 이전에 실행 중인 루프가 있다면 취소 (안전장치)
    if (recordingLoopRef.current) {
      cancelAnimationFrame(recordingLoopRef.current);
    }
    // 루프 시작
    recordingLoopRef.current = requestAnimationFrame(captureAndSendFrame);
  };

  const handleStopAndSave = () => {
    isRecordingRef.current = false; // Ref를 false로 설정 (루프가 스스로 멈춤)
    setIsRecordingUI(false); // UI State를 false로 설정
    recordingLoopRef.current = null; // 루프 ID 정리

    setServerFeedback('학습 저장 요청 중...');
    wsSendSaveLearning();
  };

  const handleStopAndQuiz = () => {
    isRecordingRef.current = false; // Ref를 false로 설정 (루프가 스스로 멈춤)
    setIsRecordingUI(false); // UI State를 false로 설정
    recordingLoopRef.current = null; // 루프 ID 정리

    setServerFeedback('퀴즈 제출 요청 중...');
    wsSendFlush();
  };
  // --- ⬆️ 수정 완료 ⬆️ ---

  return (
      <div>
        {/* (웹소켓 상태 표시 UI - 기존과 동일) ... */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-medium">웹소켓 / 연습</div>
          <div className="text-sm text-gray-500">세션: <code>{WS_SESSION_ID}</code></div>
        </div>
        <p className="mb-2">Status: <strong>{wsStatus}</strong></p>
        {/* ... (연결/해제 버튼 - 기존과 동일) ... */}


        {/* 녹화 컨트롤 및 서버 상호작용 */}
        <div className="mt-4 p-4 border rounded bg-blue-50">
          <h3 className="text-lg font-bold mb-2">수어 연습하기</h3>
          <p className="text-sm mb-3">웹소켓 상태: <strong>{wsStatus}</strong></p>

          <div className="flex items-center gap-2">
            {/* --- ⬇️ 수정된 부분 4: 핸들러 및 disabled 조건 변경 --- */}
            <button
                onClick={handleStartRecording}
                disabled={isRecordingUI || wsStatus !== 'Connected'}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
            >
              녹화 시작
            </button>

            <button
                onClick={handleStopAndSave}
                disabled={!isRecordingUI}
                className="ml-2 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            >
              개인 학습 저장
            </button>

            <button
                onClick={handleStopAndQuiz}
                disabled={!isRecordingUI}
                className="ml-2 px-4 py-2 bg-purple-600 text-white rounded disabled:bg-gray-400"
            >
              퀴즈 제출
            </button>
            {/* --- ⬆️ 수정 완료 ⬆️ --- */}
          </div>

          {/* 숨겨진 캔버스: 캡처용 (기존과 동일) */}
          <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />

          {serverFeedback && (
              <div className="mt-3 p-3 bg-white rounded shadow-inner">{serverFeedback}</div>
          )}
        </div>

        {/* 수신 메시지 미리보기 (기존과 동일) */}
        <div className="mt-3">
          <h4 className="font-medium mb-2">수신 메시지</h4>
          <div style={{ background: '#f4f4f4', padding: 8, height: 160, overflowY: 'auto' }}>
            {wsMessages.length === 0 ? (
                <div className="text-sm text-gray-500">(메시지 없음)</div>
            ) : (
                wsMessages.map((m, i) => (
                    <div key={i} className="text-sm">{JSON.stringify(m)}</div>
                ))
            )}
          </div>
        </div>
      </div>
  );
}

export default SignDetailPage;
