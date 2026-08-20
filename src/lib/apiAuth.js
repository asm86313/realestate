import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// API 라우트 요청 헤더의 "Authorization: Bearer <access_token>"을 검증해서
// 로그인한 사용자만 데이터에 접근하도록 한다.
// (세션이 브라우저 localStorage에만 저장되는 구조라 middleware에서는 확인이 불가능하므로,
//  실제 보안 경계는 여기 API 레벨에서 만든다. 요청은 src/utils/authedFetch.js / src/utils/apiClient.js에서 자동으로 붙여준다.)
export async function requireUser(request) {
	const authHeader = request.headers.get('authorization') || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (!token) return null;

	// 토큰 검증은 Auth 서버가 하는 일이라 anon 클라이언트로 충분하다.
	const { data, error } = await supabase.auth.getUser(token);
	if (error || !data?.user) return null;
	return data.user;
}

// 이 유저가 속한 "가족(워크스페이스)"의 대표 UID를 반환한다.
// - FamilyMembers에 기록이 있으면: 그 가족의 대표 UID
// - 기록이 없으면: 본인이 곧 대표이므로 자기 UID
// Buildings/Schedule/... 테이블의 ownerId 컬럼과 대조해서 서로 다른 가족의 데이터가 섞이지 않게 한다.
//
// 주의: 예전에는 user_metadata.familyOwnerId를 그대로 믿었는데, user_metadata는
// 로그인한 사용자가 supabase.auth.updateUser()로 직접 덮어쓸 수 있는 영역이다.
// 즉 남의 UID를 써넣으면 그 가족 데이터에 접근할 수 있었다. 그래서 소속 정보를
// service_role로만 접근 가능한 FamilyMembers 테이블로 옮겼다.
export async function resolveOwnerId(user) {
	const { data, error } = await supabaseAdmin
		.from('FamilyMembers')
		.select('ownerId')
		.eq('userId', user.id)
		.maybeSingle();

	// 소속을 확인하지 못했으면 접근을 열어주지 않고 실패시킨다(fail closed).
	if (error) {
		console.error('가족 소속 조회 실패:', error);
		throw new Error('가족 소속 정보를 확인할 수 없습니다.');
	}

	return data?.ownerId || user.id;
}
