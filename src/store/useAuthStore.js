import { create } from 'zustand';

// 로그인한 유저 정보만 담는 가벼운 클라이언트 상태.
// 건물/계약/일정 같은 서버 데이터는 React Query(src/hooks/queries.js)가 담당한다.
export const useAuthStore = create((set) => ({
	user: null,
	setUser: (user) => set({ user }),
	clearUser: () => set({ user: null }),
}));
