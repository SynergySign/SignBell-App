// import { apiClient } from './apiClient';
import apiClient  from './apiClient.js'

/**
 * 사용자 프로필 관련 API 호출 서비스
 * - PUT /api/my-page/users/{userId}/profile: 닉네임 및 선택 약관 동의 상태 업데이트
 */
export const UserProfileService = {
  /**
   * 닉네임 또는 선택 약관 동의 여부를 업데이트합니다.
   * @param {number} userId - 사용자 고유 ID
   * @param {object} updateData - 업데이트 데이터 ({ nickname: string, optionalAgree: boolean })
   * @returns {Promise<ApiResponse<UserProfileResponse>>}
   */
  updateProfile: async (userId, updateData) => {
    return apiClient.patch(`/my-page/users/${userId}/profile`, updateData);
  },

  // 닉네임만 업데이트하는 전용 메서드를 추가합니다.
  /**
   * 닉네임만 업데이트합니다.
   * 백엔드 UserProfileController.java의 PATCH /api/my-page/users/{userId}/nickname 엔드포인트와 매핑됩니다.
   * @param {number} userId - 사용자 고유 ID
   * @param {string} newNickname - 새로운 닉네임
   * @returns {Promise<ApiResponse<UserProfileResponse>>}
   */
  updateNickname: async (userId, nickname) => {
    // 백엔드가 NicknameUpdateRequest DTO를 받으므로 객체 형태로 전송해야 합니다.
    return apiClient.patch(`/my-page/users/${userId}/nickname`, { nickname });
  },
};