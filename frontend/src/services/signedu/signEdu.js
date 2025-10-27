// src/services/signEdu/signEdu.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

/**
 * 단일 수어 단어의 상세 정보를 가져옵니다.
 * 'http://' URL을 'https://'로 변경하여 혼합 콘텐츠 오류를 해결합니다.
 * @param {string|number} signId
 * @returns {Promise<{id: any, word: string, description: string, videoUrl: string, category: string}>}
 */
export async function getSignDetail(signId) {
  if (!signId) throw new Error('signId is required');
  const response = await api.get(`/api/sign-edu/${signId}`);
  const dto = response.data || {}; // 백엔드의 SignDetailResponseDto

  // --- [수정] 'http://' -> 'https://'로 변경 (Mixed Content 해결) ---
  let finalVideoUrl = dto.videoUrl ?? '';

  if (finalVideoUrl && finalVideoUrl.startsWith('http://')) {
    finalVideoUrl = 'https:' + finalVideoUrl.slice(5);
  }
  // ---

  // [중요] 백엔드 DTO 필드명 -> 프론트엔드 Modal prop 이름으로 변환
  return {
    id: dto.signId ?? null, // Modal은 'id'를 사용
    word: dto.wordName ?? '제목 없음', // Modal은 'word'를 사용
    description: dto.description ?? '', // Modal은 'description'을 사용
    videoUrl: finalVideoUrl, // 'https://...' URL 반환
    category: dto.tag ?? '기타' // Modal은 'category'를 사용
  };
}

/**
 * 수어 단어 목록을 페이징하여 가져옵니다.
 * (이하 함수는 원본과 동일)
 */
export async function listSignEdu({ page = 1, size = 20, category = null }) {
  const queryParams = {
    page: page - 1, // Spring Pageable은 0-indexed
    size: size,
    ...(category && category !== '전체' && { category: category }),
    sort: 'title'
  };

  const response = await api.get('/api/sign-edu', { params: queryParams });
  const data = response.data || {};

  return {
    // data.content는 [{ signId, wordName }, ...]
    words: data.content || [],
    hasNext: data.last !== undefined ? !data.last : false
  };
}

/**
 * 카테고리 목록을 조회합니다.
 * (이하 함수는 원본과 동일)
 */
export async function getCategories() {
  const response = await api.get('/api/sign-edu/categories');
  return response.data || [];
}