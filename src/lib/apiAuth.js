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

// user.app_metadata.ownerId를 써서 resolveOwnerId의 FamilyMembers 조회를 캐싱한다.
// 순수 최적화라 실패해도(권한 없음, 네트워크 순단 등) 호출부의 진짜 작업을 막으면 안 되므로
// 에러/예외를 전부 여기서 삼키고 로그만 남긴다. (다음 요청에서 다시 시도된다)
export async function cacheOwnerId(user, ownerId) {
	try {
		const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
			app_metadata: { ...user.app_metadata, ownerId },
		});
		if (error) {
			console.error('ownerId 캐싱 실패(다음 요청에서 재시도됨):', error);
		}
	} catch (err) {
		console.error('ownerId 캐싱 중 예외 발생(다음 요청에서 재시도됨):', err);
	}
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
//
// 성능: 이 함수는 API 요청마다(=requireUser 이후) 호출되는데, 매번 FamilyMembers를
// 조회하면 왕복이 하나 더 늘어난다. 그래서 한 번 조회한 결과를 app_metadata.ownerId에
// 캐싱해둔다. app_metadata는 user_metadata와 달리 service_role로만 쓸 수 있어
// 사용자가 위조할 수 없고, requireUser()의 auth.getUser(token)은 매번 Auth 서버에서
// 최신 값을 가져오므로 캐시가 오래돼 보일 걱정도 없다.
// 주의: 지금은 "가족 탈퇴/추방" 기능이 없어서 한 번 정해진 ownerId가 바뀌지 않는다.
// 나중에 그런 기능을 추가하면, 이 캐시(app_metadata.ownerId)도 같이 지워줘야 한다.
export async function resolveOwnerId(user) {
	const cached = user.app_metadata?.ownerId;
	if (cached) return cached;

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

	const ownerId = data?.ownerId || user.id;

	// 다음 요청부터는 위 조회 없이 바로 캐시를 쓰도록 저장해둔다.
	await cacheOwnerId(user, ownerId);

	return ownerId;
}
