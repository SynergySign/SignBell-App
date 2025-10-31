import axios from 'axios';
import { useAuthStore } from '../../store/auth/authStore.js'

// axios 인스턴스 만들기
// - baseURL: 프론트에서는 /api 로 호출 → vite 프록시가 백엔드로 전달
// - withCredentials: HTTP-Only 쿠키를 자동으로 포함/수신
const apiClient = axios.create({
  baseURL: 'https://api.signbell.app/api',  // 절대 URL로 변경
  withCredentials: true,
});


let isRefreshing = false; // 지금 갱신 중인지 알려주는 논리값
let refreshPromise = null; // 갱신이 끝나길 기다릴 약속(같은 약속을 여러 요청이 함께 기다림)
let retryQueue = []; // 갱신 대기열 (갱신이 끝나면 이 요청들을 모두 재실행)

// 요청 전 단계 (생략)
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// 응답 후 단계: 401 을 만나면 자동 갱신을 시도합니다.
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { clear } = useAuthStore.getState();
    const originalRequest = error?.config || {}; // 방금 실패한 원래 요청
    const status = error?.response?.status;

    console.log('originalRequest: ', originalRequest);

    // skipAuthRefresh 옵션이 있거나, 상태 코드가 없으면 그대로 실패 반환
    if (!status || originalRequest.skipAuthRefresh) return Promise.reject(error);

    // 401(인증 실패)이 아닌 경우, 여기서는 처리하지 않고 그대로 반환
    if (status !== 401) return Promise.reject(error);

    // ====================================================================
    // 🔑 [수정 1] 재시도 요청 실패 또는 Refresh 요청 자체가 실패한 경우 (최종 실패)
    //
    // - '/api/auth/refresh' 요청 자체가 401을 받았거나 (Refresh 토큰 만료)
    // - 토큰 재발급 후 재시도(originalRequest._retry === true) 했는데도 또 401을 받은 경우
    if (originalRequest.url === '/api/auth/refresh' || originalRequest._retry) {
      console.log('authStore.js:64 clear called');
      clear(); // Zustand 스토어 상태 초기화

      isRefreshing = false;
      refreshPromise = null;
      retryQueue = []; // 대기열 초기화

      // 로그인 페이지로 강제 이동
      if (window.location.pathname !== '/') {
        window.location.replace('/');
      }

      // ✅ 변경된 부분: Promise 체인을 무기한 중단하여 에러 전파를 막습니다.
      return new Promise(() => { }); // 절대 resolve/reject 되지 않는 Pending Promise 반환
    }
    // ====================================================================


    // Access Token 만료 (일반적인 401) - 토큰 갱신 시도
    try {
      if (!isRefreshing) {
        console.log('액세스 토큰 재발급 시작');

        isRefreshing = true;
        originalRequest._retry = true; // 이 요청은 한 번 재시도 허용

        // 순환 의존성 방지를 위해 동적 import 사용
        const { AuthService } = await import('../../services/api/authService.js');

        // 리프레시 요청을 저장하고, 다른 요청들은 이 Promise를 기다리게 합니다.
        refreshPromise = AuthService.refresh();

        // 새 Access Token 발급이 끝날 때까지 기다립니다.
        await refreshPromise;

        // 갱신 성공 후: 상태 초기화
        isRefreshing = false;
        refreshPromise = null;

        // 대기열에 있던 요청들을 모두 재실행합니다.
        retryQueue.forEach(resolve => resolve());
        retryQueue = [];

      } else {
        // 누군가 이미 갱신 중이면, 그 갱신이 끝날 때까지 기다립니다.
        await new Promise(resolve => retryQueue.push(resolve));
      }

      // 갱신된 Access Token을 사용하여 원본 요청을 재시도합니다.
      return apiClient(originalRequest);

    } catch (refreshError) {
      // ====================================================================
      // 🔑 [수정 2] refreshPromise 실행 중 에러가 발생한 경우 (예상치 못한 Refresh 실패)
      //
      // 콘솔 로그에 찍힌 에러(POST /api/auth/refresh 401)가 이 catch 블록으로 다시 들어올 수 있습니다.
      // 이 경우에도 강제 리다이렉션 후 에러 전파를 막아야 합니다.
      // ====================================================================
      console.error("토큰 재발급 중 치명적인 오류 발생:", refreshError);

      console.log('authStore.js:64 clear called');
      clear();

      isRefreshing = false;
      refreshPromise = null;
      retryQueue = [];

      if (window.location.pathname !== '/') {
        window.location.replace('/');
      }

      // ✅ 변경된 부분: Promise 체인을 무기한 중단하여 에러 전파를 막습니다.
      return new Promise(() => { }); // 절대 resolve/reject 되지 않는 Pending Promise 반환
    }
  }
);

export default apiClient;