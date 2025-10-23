import axios from 'axios';
import { useAuthStore } from '../../store/auth/authStore.js'

// axios 인스턴스 만들기
// - baseURL: 프론트에서는 /api 로 호출 → vite 프록시가 백엔드로 전달
// - withCredentials: HTTP-Only 쿠키를 자동으로 포함/수신
const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});


let isRefreshing = false; // 지금 갱신 중인지 알려주는 논리값
let refreshPromise = null; // 갱신이 끝나길 기다릴 약속(같은 약속을 여러 요청이 함께 기다림)

// 요청 전 단계
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


    // 네트워크 에러 등 상태 코드가 없으면 그대로 실패 반환
    if (!status) return Promise.reject(error);


    // 401(인증 실패)이 아닌 경우, 여기서는 처리하지 않음
    // 또한, 아래에서 refresh 를 호출할 때는 skipAuthRefresh 플래그로 여기 재진입을 막습니다.
    if (status !== 401 || originalRequest?.skipAuthRefresh) {
      return Promise.reject(error);
    }

    // 만약 이 에러가 "리프레시 요청 자체"에서 난 거라면 → Refresh Token 도 만료
    // 이 경우에는 더 이상 방법이 없으니 로그인 상태를 비웁니다.
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');
    if (isRefreshCall) {
      clear();
      localStorage.removeItem('auth');
      // 프레시 실패 시, 최종적으로 로그인 페이지로 강제 이동
      if (window.location.pathname !== '/') {
        window.location.replace('/'); // 로그인 페이지로 리다이렉션
      }

      // 리다이렉션 발생 시, 호출한 컴포넌트로 에러가 전달되는 것을 막아 화면 잔상 방지
      return new Promise(() => {}); // 절대 resolve/reject 되지 않는 Promise 반환
      // return Promise.reject(error);
    }

    // 같은 요청을 무한히 재시도하지 않도록 안전장치
    if (originalRequest._retry) {
      clear();
      localStorage.removeItem('auth');

      // 프레시 실패 또는 무한 재시도 감지 시, 최종적으로 로그인 페이지로 강제 이동
      if (window.location.pathname !== '/') {
        // replace를 사용하여 뒤로 가기 기록에 현재 페이지를 남기지 않습니다.
        window.location.replace('/');
      }

      // 🔑 리다이렉션 발생 시, 호출한 컴포넌트로 에러가 전달되는 것을 막아 화면 잔상 방지
      return new Promise(() => {}); // 절대 resolve/reject 되지 않는 Promise 반환
      // return Promise.reject(error);
    }

    try {
      if (!isRefreshing) {
        console.log('액세스 토큰 재발급 시작');

        // 내가 갱신 담당일 때: 한 번만 새 토큰을 받아옵니다.
        isRefreshing = true;

        // _retry는 "이 요청이 이미 한 번 토큰 갱신 후 재시도된 적이 있다"는 표시
        // 무한 루프 방지용 안전장치
        originalRequest._retry = true; // 이 요청은 한 번 재시도 허용


        // 정적 import를 해서 파일 로딩 시점에 불러오면
        // apiClient.js, authService.js 두 파일이 서로 동시에 import 하려고 하므로
        // "순환 의존성(circular dependency)" 문제 발생
        // 그러므로, 동적 import를 통해 함수 실행 시점에 AuthService 를 가져옵니다.
        const { AuthService } = await import('../../services/api/authService.js');

        // refreshPromise 에 "리프레시 요청"을 저장해 두고, 다른 요청들도 이 약속을 함께 기다리게 합니다.
        refreshPromise = AuthService.refresh();

        // 새 Access Token 발급이 끝날 때까지 기다립니다.
        const res = await refreshPromise;
        console.log('res if: ', res);
      } else {
        // 누군가 이미 갱신 중이면, 그 갱신이 끝날 때까지 기다립니다.
        await refreshPromise;
        originalRequest._retry = true;
      }

      // 여기까지 왔다면, 갱신이 끝난 상태 → 방금 실패한 요청을 다시 보냅니다.
      return apiClient(originalRequest);
    } catch (refreshErr) {
      // 리프레시도 실패한 경우 → 로그인 상태 초기화 후 실패 반환
      clear();
      localStorage.removeItem('auth');
      return Promise.reject(refreshErr);
    } finally {
      // 갱신 끝났음을 알림
      isRefreshing = false;
    }
  }
);

export default apiClient;
