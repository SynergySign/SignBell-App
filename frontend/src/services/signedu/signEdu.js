// src/services/signEdu.js
// Sign education 관련 API 호출을 분리한 모듈입니다.
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

/**
 * 단일 수어 단어의 상세 정보를 가져와서 일관된 DTO 형태로 반환합니다.
 * @param {string|number} signId
 * @returns {Promise<{signId: any, wordName: string, description: string, videoUrl: string}>}
 */
export async function getSignDetail(signId) {
  if (!signId) throw new Error('signId is required');
  const response = await api.get(`/api/sign-edu/${signId}`);
  const data = response.data || {};
  const dto = data.content || data;

  return {
    signId: dto.signId ?? dto.id ?? null,
    wordName: dto.wordName ?? dto.word ?? dto.name ?? '제목 없음',
    description: dto.description ?? dto.desc ?? dto.detail ?? '',
    videoUrl: dto.videoUrl ?? dto.video_url ?? dto.video ?? ''
  };
}

/**
 * 수어 단어 목록을 가져옵니다. 필요 시 params를 통해 페이징/필터를 전달할 수 있습니다.
 * @param {Object} params
 * @returns {Promise<Array>}
 */
export async function listSignEdu(params = {}) {
  const response = await api.get('/api/sign-edu', { params });
  const data = response.data || {};
  // Spring Page 형태라면 content에 배열이 있음
  return data.content || data || [];
}

/**
 * 카테고리 목록을 조회합니다.
 * @returns {Promise<Array<string>>}
 */
export async function getCategories() {
  const response = await api.get('/api/sign-edu/categories');
  return response.data || [];
}
