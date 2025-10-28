/**
 * @파일명 rankService.js
 * @개요 사용자 랭킹 관련 API 서비스
 * @author 강관주
 * @since 2025-10-28
 */

import apiClient from './apiClient';

export const RankService = {
  /**
   * 상위 8명의 사용자 랭킹 조회
   * @returns {Promise<Array<{rank: number, nickname: string, score: number, profileImage: string|null}>>}
   */
  getRankings: async () => {
    try {
      const response = await apiClient.get('/users/rank');
      return response.data.data; // ApiResponse의 data 필드 추출
    } catch (error) {
      console.error('랭킹 데이터 조회 실패:', error);
      throw error; // 에러를 호출자에게 전파
    }
  },
};
