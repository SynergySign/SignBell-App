/**
 * @파일명 webcamStore.js
 * @개요 웹캠 상태를 전역으로 관리하는 Zustand Store
 * @설명 대기실과 게임 페이지 간 웹캠 상태 공유
 * @작성일 2025-10-23
 */

import { create } from 'zustand';

export const useWebcamStore = create((set, get) => ({
  // 웹캠 스트림
  stream: null,
  
  // 웹캠 켜짐 여부
  isWebcamOn: false,
  
  // 에러 메시지
  error: null,

  // 웹캠 시작
  startWebcam: async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      set({ 
        stream: mediaStream, 
        isWebcamOn: true, 
        error: null 
      });

      // 트랙 종료 감지
      mediaStream.getTracks().forEach(track => {
        track.onended = () => {
          console.warn('⚠️ 웹캠 트랙이 종료됨');
          set({ isWebcamOn: false });
        };
      });

      console.log('✅ 웹캠 시작 성공');
      return mediaStream;
    } catch (err) {
      console.error('❌ 웹캠 시작 실패:', err);
      set({ 
        error: err.message, 
        isWebcamOn: false 
      });
      throw err;
    }
  },

  // 웹캠 중지
  stopWebcam: () => {
    const { stream } = get();
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      set({ 
        stream: null, 
        isWebcamOn: false 
      });
      console.log('🛑 웹캠 중지');
    }
  },

  // 웹캠 토글
  toggleWebcam: async () => {
    const { isWebcamOn, startWebcam, stopWebcam } = get();
    if (isWebcamOn) {
      stopWebcam();
    } else {
      await startWebcam();
    }
  },

  // 에러 초기화
  clearError: () => set({ error: null }),
}));
