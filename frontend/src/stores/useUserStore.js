/**
 * @파일명 useUserStore.js
 * @개요 사용자 정보를 전역으로 관리하는 Zustand Store
 * @작성자 고동현
 * @작성일 2025-10-23
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
    persist(
        (set) => ({
            // 사용자 정보
            userId: null,
            nickname: null,
            profileImage: null,
            email: null,

            // 사용자 정보 설정
            setUser: (userInfo) => set({
                userId: userInfo.id || userInfo.userId,
                nickname: userInfo.nickname,
                profileImage: userInfo.profileImage || userInfo.profileImageUrl,
                email: userInfo.email,
            }),

            // 사용자 정보 초기화
            clearUser: () => set({
                userId: null,
                nickname: null,
                profileImage: null,
                email: null,
            }),

            // 특정 필드만 업데이트
            updateUser: (updates) => set((state) => ({
                ...state,
                ...updates,
            })),
        }),
        {
            name: 'user-storage', // localStorage 키 이름
            partialize: (state) => ({
                userId: state.userId,
                nickname: state.nickname,
                profileImage: state.profileImage,
                email: state.email,
            }),
        }
    )
);

export default useUserStore;
