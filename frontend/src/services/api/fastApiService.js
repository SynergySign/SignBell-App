/**
 * FastAPI 서버 연동 서비스
 * 
 * 수어 인식 AI 서버와 통신하는 API 서비스
 * 
 * @author 고동현
 * @since 2025-10-23
 */

import axios from 'axios';

// FastAPI 서버 URL (환경 변수로 관리)
const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

/**
 * FastAPI axios 인스턴스
 */
const fastApiClient = axios.create({
  baseURL: FASTAPI_BASE_URL,
  timeout: 30000, // 30초 (AI 처리 시간 고려)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * WebSocket으로 수어 동작 검증 (실시간 스트리밍)
 * 
 * @param {string} sessionId - 세션 ID (roomId 또는 userId)
 * @param {string} token - JWT 인증 토큰
 * @param {Object} meta - 메타 정보
 * @param {number} meta.word_pk - 단어 PK
 * @param {string} meta.word_name - 단어 이름
 * @param {number} meta.user_id - 사용자 ID
 * @param {Function} onResult - 결과 수신 콜백
 * @returns {Object} WebSocket 제어 객체
 */
export const verifySignLanguageWebSocket = (sessionId, token, meta, onResult) => {
  const wsUrl = FASTAPI_BASE_URL.replace('http', 'ws').replace('https', 'wss') + `/ws/sign/${sessionId}?token=${token}`;
  
  console.log('🔌 FastAPI WebSocket 연결:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  let isConnected = false;
  
  ws.onopen = () => {
    console.log('✅ FastAPI WebSocket 연결 성공');
    isConnected = true;
    
    // 메타 정보 전송
    ws.send(JSON.stringify({
      type: 'meta',
      word_pk: meta.word_pk,
      word_name: meta.word_name,
      user_id: meta.user_id
    }));
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 FastAPI 메시지:', data);
      
      if (data.type === 'inference_result') {
        onResult(data.result);
      }
    } catch (error) {
      console.error('❌ WebSocket 메시지 파싱 실패:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('❌ FastAPI WebSocket 에러:', error);
  };
  
  ws.onclose = () => {
    console.log('🔌 FastAPI WebSocket 연결 종료');
    isConnected = false;
  };
  
  return {
    /**
     * 프레임 전송 (바이너리)
     * @param {Blob} frameBlob - JPEG 이미지 Blob
     */
    sendFrame: async (frameBlob) => {
      if (isConnected && ws.readyState === WebSocket.OPEN) {
        const arrayBuffer = await frameBlob.arrayBuffer();
        ws.send(arrayBuffer);
      }
    },
    
    /**
     * 추론 요청 (flush)
     */
    requestInference: () => {
      if (isConnected && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'flush' }));
      }
    },
    
    /**
     * 연결 종료
     */
    close: () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    },
    
    /**
     * 연결 상태 확인
     */
    isConnected: () => isConnected
  };
};

/**
 * 실시간 수어 스트리밍 (WebSocket 사용 시)
 * 
 * @param {string} roomId - 방 ID
 * @param {Function} onMessage - 메시지 수신 콜백
 * @returns {WebSocket} WebSocket 인스턴스
 */
export const connectSignStreamingWebSocket = (roomId, onMessage) => {
  const wsUrl = FASTAPI_BASE_URL.replace('http', 'ws') + `/ws/sign/${roomId}`;
  
  console.log('🔌 FastAPI WebSocket 연결:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ FastAPI WebSocket 연결 성공');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('❌ WebSocket 메시지 파싱 실패:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('❌ FastAPI WebSocket 에러:', error);
  };
  
  ws.onclose = () => {
    console.log('🔌 FastAPI WebSocket 연결 종료');
  };
  
  return ws;
};

/**
 * 비디오 프레임을 Blob으로 캡처 (WebSocket 전송용)
 * 
 * @param {HTMLVideoElement} videoElement - 비디오 엘리먼트
 * @returns {Promise<Blob>} JPEG 이미지 Blob
 */
export const captureFrameAsBlob = (videoElement) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // JPEG Blob으로 변환 (품질 80%)
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/jpeg', 0.8);
  });
};

/**
 * 여러 프레임을 캡처하여 배열로 반환
 * 
 * @param {HTMLVideoElement} videoElement - 비디오 엘리먼트
 * @param {number} duration - 캡처 시간 (밀리초)
 * @param {number} fps - 초당 프레임 수
 * @returns {Promise<Array<string>>} Base64 프레임 배열
 */
export const captureFrames = async (videoElement, duration = 10000, fps = 5) => {
  const frames = [];
  const interval = 1000 / fps; // 프레임 간격 (밀리초)
  const totalFrames = Math.floor(duration / interval);
  
  console.log(`📹 프레임 캡처 시작: ${duration}ms, ${fps}fps, 총 ${totalFrames}프레임`);
  
  return new Promise((resolve) => {
    let frameCount = 0;
    
    const captureInterval = setInterval(() => {
      if (frameCount >= totalFrames) {
        clearInterval(captureInterval);
        console.log(`✅ 프레임 캡처 완료: ${frames.length}개`);
        resolve(frames);
        return;
      }
      
      const frame = captureFrameAsBase64(videoElement);
      frames.push(frame);
      frameCount++;
    }, interval);
  });
};

export default {
  verifySignLanguageWebSocket,
  connectSignStreamingWebSocket,
  captureFrameAsBlob,
  captureFrames,
};
