import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthService } from '../../services/api/authService.js';

/**
 * Auth Store (Zustand + persist)
 *
 * 목적
 * - 사용자 인증 상태(user, isAuthenticated)를 전역으로 관리
 * - HTTP-Only 쿠키 기반이므로 토큰을 메모리에 저장하지 않습니다.
 * - 새로고침에도 인증 상태를 유지하기 위해 일부 상태를 localStorage에 저장
 *
 * 저장 전략
 * - persist(partialize)로 user, isAuthenticated만 저장
 *
 * 사용 패턴
 * - 앱 최초 진입: fetchMe() 호출로 쿠키 기반 인증
 * - 로그아웃: logout() 호출 → 서버 쿠키 삭제 + 클라이언트 상태 초기화
 */

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  hasCheckedAuth: false, // /users/me 체크를 최소 한 번 수행했는지
};

/**
 * 사용자 인증 상태를 관리하는 초기 상태 객체
 *
 * useAuthStore 상태 필드
 * @typedef {Object} initialState - 초기 상태 객체
 * @property {Object|null} user - 현재 인증된 사용자 정보. 사용자가 인증되지 않은 경우 null.
 * @property {boolean} isAuthenticated - 사용자가 인증되었는지 여부를 나타내는 플래그.
 * @property {boolean} loading - 서버 통신 작업이 진행 중인지 여부를 나타내는 플래그.
 * @property {Object|null} error - 인증 과정에서 발생한 오류 정보. 오류가 없을 경우 null.
 * @property {boolean} hasCheckedAuth - /users/me API 호출을 최소 한 번이라도 수행했는지 여부.
 *
 * 액션
 * - setUser(user): 사용자/인증여부 설정
 * - clear(): 스토어 전체 초기화
 * - fetchMe(): 쿠키 기반 현재 사용자 조회
 * - logout(): 서버 로그아웃 요청 후 상태 초기화
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * 사용자 상태를 설정
       * @param {object|null} user
       */
      /*setUser: (user) => {
        console.log('setUser called with:', user);
        set({ user, isAuthenticated: !!user, error: null });
      },*/
      setUser: (userData) => {
        if (!userData) {
          // userData가 null이면 로그아웃 처리
          set({ user: null, isAuthenticated: false, error: null });
          return;
        }

        set({
          user: {
            // 사용자 ID
            userId: userData.userId,
            // 닉네임
            nickname: userData.nickname,
            // 이메일
            email: userData.email,
            // 프로필 이미지 URL
            profileImageUrl: userData.profileImageUrl,
            // 토탈 스코어
            totalScore: userData.totalScore,
            // 필수 동의 여부 (필드 누락 시 기본값: true)
            requiredAgree: userData.requiredAgree ?? true,
            // 🔑 선택 약관 동의 상태 (필드 누락 시 기본값: false)
            optionalAgree: userData.optionalAgree ?? false,
          },
          isAuthenticated: true,
          error: null,
        });
      },

      /**
       * 모든 상태 초기화
       */
      clear: () => {
        console.log('clear called');
        set({...initialState, hasCheckedAuth: true});
      },

      /**
       * 현재 사용자 정보를 조회
       * - 성공 시 user 설정 및 isAuthenticated=true
       * - 실패/미인증 시 user=null, isAuthenticated=false
       */
      fetchMe: async () => {
        console.log('fetchMe called');
        set({loading: true, error: null});
        try {
          const res = await AuthService.me();
          console.log('fetchMe response:', res);
          if (res?.data?.success) {
            // const userData = res.data.data;
            let userData = res.data.data;

            // Mixed Content 경고 해결: http를 https로 강제 변경
            if (userData?.profileImageUrl) {
              const secureImageUrl = userData.profileImageUrl.replace(/^http:\/\//i, 'https://');
              userData = {...userData, profileImageUrl: secureImageUrl};
            }

            console.log('Setting user data:', userData);
            set({user: userData, isAuthenticated: true, loading: false, hasCheckedAuth: true});
          } else {
            // console.log('No success in response');
            set({user: null, isAuthenticated: false, loading: false, hasCheckedAuth: true});
          }
        } catch (error) {
          console.log('fetchMe error:', error);
          // 인증 실패 시 로컬스토리지도 초기화
          set({user: null, isAuthenticated: false, error: 'unauthenticated', loading: false, hasCheckedAuth: true});
          // localStorage에서 auth 데이터 제거
          try {
            localStorage.removeItem('auth');
            // console.log('Cleared localStorage auth data');
          } catch (e) {
            console.error('Failed to clear localStorage:', e);
          }
        }
      },

      /**
       * 현재 사용자 정보를 조용히(background) 갱신합니다.
       * - PrivateRoute의 로딩 게이트를 건드리지 않도록 loading/hasCheckedAuth를 변경하지 않습니다.
       * - 대시보드 진입, 조인/리브/생성 성공 직후 숫자 동기화 등에 사용합니다.
       */
      refreshMeSilent: async () => {
        try {
          const res = await AuthService.me();
          if (res?.data?.success) {
            set({user: res.data.data, isAuthenticated: true});
          } else {
            set({user: null, isAuthenticated: false});
          }
        } catch {
          // 조용히 실패 무시 (화면 끊김 방지)
        }
      },

      /**
       * 서버에 로그아웃을 요청하고 로컬 상태를 초기화합니다.
       * - 서버는 HTTP-Only 쿠키를 삭제합니다.
       */
      logout: async () => {
        try {
          await AuthService.logout();
        } catch {
          // ignore
        } finally {
          set({...initialState, hasCheckedAuth: true});
        }
      },
    }),
    {
      // auth localStorage
      name: 'auth',
      // 저장할 필드는 user와 isAuthenticated
      partialize: (state) => {
        // console.log('partialize called with state:', state);
        const userToPersist = state.user
          ? {
            // 사용자 ID
            userId: state.user.userId,
            // 닉네임
            nickname: state.user.nickname,
            // 프로필 이미지 URL
            profileImage: state.user.profileImageUrl,
            // 토탈 스코어
            totalScore: state.user.totalScore,
            // 필수 동의 여부 (앱 플로우 제어용)
            requiredAgree: state.user.requiredAgree, // 🔑 필수 포함
            // 선택 동의 여부
            optionalAgree: state.user.optionalAgree,
          }
          : null; // 인증되지 않은 경우 null
        return {
          user: userToPersist,
          isAuthenticated: state.isAuthenticated,
        };
      },
      // HTTPS 환경에서 localStorage 접근 문제 해결
      storage: {
        getItem: (name) => {
          try {
            const item = localStorage.getItem(name);
            // console.log('localStorage getItem:', name, item);
            return item;
          } catch (error) {
            console.error('localStorage getItem error:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            // JSON.stringify로 직렬화하여 [object Object] 문제 해결
            const serializedValue = JSON.stringify(value);
            // console.log('localStorage setItem:', name, serializedValue);
            localStorage.setItem(name, serializedValue);
          } catch (error) {
            console.error('localStorage setItem error:', error);
          }
        },
        removeItem: (name) => {
          try {
            // console.log('localStorage removeItem:', name);
            localStorage.removeItem(name);
          } catch (error) {
            console.error('localStorage removeItem error:', error);
          }
        },
      },
    }
  )
);
