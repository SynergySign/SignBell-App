// src/services/signEdu/signEdu.js

// [수정 1] axios 대신 apiClient를 import 합니다.
// (경로는 실제 파일 위치에 맞게 조정해야 할 수 있습니다.)
import apiClient from '../api/apiClient.js'; // 예: ../../api/apiClient.js 또는 ../apiClient.js 등

// [수정 2] 기존 axios 인스턴스 생성 로직을 제거합니다.
// const API_BASE_URL = import.meta.env.VITE_API_URL || '';
// const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });


/**
 * 단일 수어 단어의 상세 정보를 가져옵니다.
 * 'http://' URL을 'https://'로 변경하여 혼합 콘텐츠 오류를 해결합니다.
 * @param {string|number} signId
 * @returns {Promise<{id: any, word: string, description: string, videoUrl: string, category: string}>}
 */
export async function getSignDetail(signId) {
    if (!signId) throw new Error('signId is required');

    // [수정 3] 'api' 대신 'apiClient'를 사용하고, baseURL ('/api')이 중복되지 않도록 URL 경로를 수정합니다.
    const response = await apiClient.get(`/sign-edu/${signId}`); // '/api' 제거
    const dto = response.data || {}; // 백엔드의 SignDetailResponseDto

    // --- 'http://' -> 'https://'로 변경 (Mixed Content 해결) ---
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
 *
 */
export async function listSignEdu({ page = 1, size = 20, category = null, keyword = null }) {
    const queryParams = {
        page: page - 1, // Spring Pageable은 0-indexed
        size: size,
        sort: 'title' // [참고] 백엔드 검색 로직이 우선순위 정렬을 하므로, 이 sort는 예비용
    };

    // [수정] keyword 또는 category를 조건부로 추가
    if (keyword && keyword.trim()) {
        queryParams.keyword = keyword;
    } else if (category && category !== '전체') {
        queryParams.category = category;
    }

    // [수정 3] 'api' 대신 'apiClient'를 사용하고, baseURL ('/api')이 중복되지 않도록 URL 경로를 수정합니다.
    const response = await apiClient.get('/sign-edu', { params: queryParams }); // '/api' 제거
    const data = response.data || {};

    return {
        words: data.content || [],
        hasNext: data.last !== undefined ? !data.last : false
    };
}

/**
 * 카테고리 목록을 조회합니다.
 * (이하 함수는 원본과 동일)
 */
export async function getCategories() {
    // [수정 3] 'api' 대신 'apiClient'를 사용하고, baseURL ('/api')이 중복되지 않도록 URL 경로를 수정합니다.
    const response = await apiClient.get('/sign-edu/categories'); // '/api' 제거
    return response.data || [];
}