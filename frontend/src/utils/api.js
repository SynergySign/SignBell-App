/**
 * @파일명 api.js
 * @설명 API 통신을 위한 axios 설정 및 유틸리티 함수
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-21
 */

import axios from 'axios';

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config) => {
    // TODO: 인증 토큰이 있다면 헤더에 추가
    // const token = localStorage.getItem('accessToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    
    console.log('API 요청:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API 요청 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    console.log('API 응답:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API 응답 에러:', error.response?.status, error.response?.data);
    
    // TODO: 에러 상태에 따른 처리
    // if (error.response?.status === 401) {
    //   // 인증 실패 - 로그인 페이지로 리다이렉트
    //   localStorage.removeItem('accessToken');
    //   window.location.href = '/login';
    // }
    
    return Promise.reject(error);
  }
);

// ============================================
// 퀴즈 게임 관련 API 함수들
// ============================================

/**
 * 방 정보 조회
 * @param {string} roomId - 방 ID
 * @returns {Promise} 방 정보
 */
export const getRoomInfo = async (roomId) => {
  const response = await apiClient.get(`/api/rooms/${roomId}`);
  return response.data;
};

/**
 * 방 참가자 목록 조회
 * @param {string} roomId - 방 ID
 * @returns {Promise} 참가자 목록
 */
export const getRoomParticipants = async (roomId) => {
  const response = await apiClient.get(`/api/rooms/${roomId}/participants`);
  return response.data;
};

/**
 * 게임 시작
 * @param {string} roomId - 방 ID
 * @returns {Promise} 게임 시작 결과
 */
export const startGame = async (roomId) => {
  const response = await apiClient.post(`/api/rooms/${roomId}/game/start`);
  return response.data;
};

/**
 * 도전 신청
 * @param {string} roomId - 방 ID
 * @param {number} questionNumber - 문제 번호
 * @returns {Promise} 도전 신청 결과
 */
export const challengeQuestion = async (roomId, questionNumber) => {
  const response = await apiClient.post(`/api/rooms/${roomId}/game/challenge`, {
    questionNumber
  });
  return response.data;
};

/**
 * 수어 인식 결과 전송
 * @param {string} roomId - 방 ID
 * @param {Object} signData - 수어 데이터
 * @returns {Promise} 인식 결과
 */
export const submitSignRecognition = async (roomId, signData) => {
  const response = await apiClient.post(`/api/rooms/${roomId}/game/sign-recognition`, signData);
  return response.data;
};

/**
 * 게임 결과 조회
 * @param {string} roomId - 방 ID
 * @returns {Promise} 게임 결과
 */
export const getGameResult = async (roomId) => {
  const response = await apiClient.get(`/api/rooms/${roomId}/game/result`);
  return response.data;
};

/**
 * 방 나가기
 * @param {string} roomId - 방 ID
 * @returns {Promise} 나가기 결과
 */
export const leaveRoom = async (roomId) => {
  const response = await apiClient.post(`/api/rooms/${roomId}/leave`);
  return response.data;
};

// ============================================
// WebRTC 관련 API 함수들 (향후 구현)
// ============================================

/**
 * WebRTC 시그널링 서버 연결 정보 조회
 * @param {string} roomId - 방 ID
 * @returns {Promise} 시그널링 서버 정보
 */
export const getWebRTCSignalingInfo = async (roomId) => {
  const response = await apiClient.get(`/api/rooms/${roomId}/webrtc/signaling`);
  return response.data;
};

// ============================================
// 에러 처리 유틸리티
// ============================================

/**
 * API 에러 메시지 추출
 * @param {Error} error - axios 에러 객체
 * @returns {string} 사용자 친화적인 에러 메시지
 */
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return '잘못된 요청입니다.';
      case 401:
        return '인증이 필요합니다.';
      case 403:
        return '권한이 없습니다.';
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.';
      case 500:
        return '서버 오류가 발생했습니다.';
      default:
        return '알 수 없는 오류가 발생했습니다.';
    }
  }
  
  if (error.code === 'ECONNABORTED') {
    return '요청 시간이 초과되었습니다.';
  }
  
  return '네트워크 오류가 발생했습니다.';
};

export default apiClient;