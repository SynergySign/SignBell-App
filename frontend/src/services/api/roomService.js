/**
 * @파일명 roomService.js
 * @개요 퀴즈 방 관련 API 서비스
 * @author 강관주
 * @since 2025-10-21
 */

import apiClient from './apiClient';

export const RoomService = {
  /**
   * 퀴즈 방 생성
   * @param {string} gameTitle - 방 제목 (1~50자, 공백 불가)
   * @returns {Promise<{gameRoomId: number}>} 생성된 방 ID
   */
  createRoom: async (gameTitle) => {
    try {
      const response = await apiClient.post('/quiz/rooms', {
        gameTitle: gameTitle.trim(),
      });
      return response.data.data;
    } catch (error) {
      console.error('방 생성 실패:', error);
      throw error;
    }
  },

  /**
   * 퀴즈 방 목록 조회
   * @param {number} page - 페이지 번호 (0부터 시작)
   * @param {number} size - 페이지당 항목 수 (기본값: 10)
   * @returns {Promise<{roomList: Array, hasNext: boolean}>}
   */
  getRoomList: async (page = 0, size = 10) => {
    try {
      const response = await apiClient.get('/quiz/rooms', {
        params: { page, size },
      });
      return response.data.data;
    } catch (error) {
      console.error('방 목록 조회 실패:', error);
      throw error;
    }
  },

  /**
   * 퀴즈 방 상세 조회
   * @param {number} roomId - 방 ID
   * @returns {Promise<Object>} 방 상세 정보
   */
  getRoomDetail: async (roomId) => {
    try {
      const response = await apiClient.get(`/quiz/rooms/${roomId}`);
      return response.data.data;
    } catch (error) {
      console.error('방 상세 조회 실패:', error);
      throw error;
    }
  },

  /**
   * WebSocket 세션 상태 확인
   * @returns {Promise<{active: boolean, reason: string}>}
   */
  checkWsSession: async () => {
    try {
      const response = await apiClient.get('/ws/session/active');
      return response.data.data;
    } catch (error) {
      console.error('WS 세션 확인 실패:', error);
      throw error;
    }
  },
};