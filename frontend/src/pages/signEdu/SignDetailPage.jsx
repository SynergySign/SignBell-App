// SignDetailPage.jsx
// 단일 수어 단어의 상세 정보(제목, 설명, 동영상)를 보여줍니다.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignDetail } from '../../services/signedu/signEdu.js';
import useSignEduWebcam from '../../services/signedu/signEduWebcam.js';
import {
  connect as wsConnect,
  disconnect as wsDisconnect,
  sendMeta as wsSendMeta,
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

      {/* 웹소켓 연결 UI (SignDetailPage에 추가) */}
      <div className="mt-6 p-4 border rounded bg-white">
        <WebSocketSection />
      </div>
    </div>
  );
};

// 별도 컴포넌트로 분리: SignDetailPage 내에서만 사용되는 간단한 웹소켓 UI
function WebSocketSection() {
  const [wsStatus, setWsStatus] = React.useState(wsGetStatus());
  const [wsMessages, setWsMessages] = React.useState([]);

  React.useEffect(() => {
    const offStatus = wsOnStatus((s) => setWsStatus(s));
    const offMsg = wsOnMessage((m) => setWsMessages((prev) => [...prev, m]));
    return () => {
      offStatus();
      offMsg();
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-medium">웹소켓</div>
        <div className="text-sm text-gray-500">세션: <code>{WS_SESSION_ID}</code></div>
      </div>

      <p className="mb-2">Status: <strong>{wsStatus}</strong></p>

      <div className="mb-3">
        <button
          onClick={() => wsConnect()}
          className="px-3 py-1 bg-indigo-600 text-white rounded"
          disabled={wsStatus === 'Connected'}
        >
          웹소켓 연결하기
        </button>

        <button
          onClick={() => wsDisconnect()}
          className="ml-2 px-3 py-1 bg-gray-200 rounded"
          disabled={wsStatus !== 'Connected'}
        >
          연결 해제
        </button>

        <button
          onClick={() => { try { wsSendMeta(); } catch (e) { alert(e.message); } }}
          className="ml-2 px-3 py-1 bg-green-500 text-white rounded"
          disabled={wsStatus !== 'Connected'}
        >
          테스트 'meta' 전송
        </button>
      </div>

      <div>
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
