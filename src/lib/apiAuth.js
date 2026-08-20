import { supabase } from '@/lib/supabase';

// API 라우트 요청 헤더의 "Authorization: Bearer <access_token>"을 검증해서
// 로그인한 사용자만 데이터에 접근하도록 한다.
// (세션이 브라우저 localStorage에만 저장되는 구조라 middleware에서는 확인이 불가능하므로,
//  실제 보안 경계는 여기 API 레벨에서 만든다. 요청은 src/utils/authedFetch.js / src/utils/apiClient.js에서 자동으로 붙여준다.)
export async function requireUser(request) {
	const authHeader = request.headers.get('authorization') || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (!token) return null;

	const { data, error } = await supabase.auth.getUser(token);
	if (error || !data?.user) return null;
	return data.user;
}

// 이 유저가 속한 "가족(워크스페이스)"의 대표 UID를 반환한다.
// - 대표 본인: 자기 자신의 UID
// - 가족회원(가족코드 로그인 계정 포함): user_metadata.familyOwnerId
// Buildings/Schedule/... 테이블의 ownerId 컬럼과 대조해서 서로 다른 가족의 데이터가 섞이지 않게 한다.
export function resolveOwnerId(user) {
	return user.user_metadata?.familyOwnerId || user.id;
}
