import { create } from 'zustand';

// 로그인한 유저 정보만 담는 가벼운 클라이언트 상태.
// 건물/계약/일정 같은 서버 데이터는 React Query(src/hooks/queries.js)가 담당한다.
export const useAuthStore = create((set) => ({
	user: null,
	// 최초 세션 복원(getSession)이 끝났는지. 이게 true가 되기 전에는
	// "로그인 안 됨"인지 "아직 확인 중"인지 구분할 수 없어서 리다이렉트 판단에 쓴다.
	authChecked: false,
	setUser: (user) => set({ user, authChecked: true }),
	clearUser: () => set({ user: null, authChecked: true }),
}));
