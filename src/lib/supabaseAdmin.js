import { createClient } from '@supabase/supabase-js';

// 서버(API 라우트) 전용 Supabase 클라이언트.
//
// service_role 키는 RLS(Row Level Security)를 우회하는 관리자 권한이라
// 절대로 브라우저에 노출되면 안 된다. NEXT_PUBLIC_ 접두사가 없는 환경변수는
// Next.js가 클라이언트 번들에 넣지 않으므로, 이 파일은 서버에서만 로드된다.
//
// 브라우저에서 쓰는 anon 클라이언트는 src/lib/supabase.js 쪽이다. 헷갈리지 말 것.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
	throw new Error(
		'SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. ' +
			'Supabase 대시보드 > Project Settings > API > service_role 키를 .env(로컬)와 Vercel 환경변수에 추가하세요.'
	);
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
	// 서버에는 로그인 세션이라는 개념이 없다. 토큰을 디스크/메모리에 남기지 않는다.
	auth: { persistSession: false, autoRefreshToken: false },
	global: {
		// 각 API 라우트에 export const dynamic = 'force-dynamic'을 넣어뒀는데도,
		// Next.js의 fetch 데이터 캐시가 supabase-js 내부 fetch 호출까지는 항상
		// 확실히 안 꺼지는 경우가 있었다(삭제 직후에도 옛날 응답이 계속 나오는 버그로 확인됨).
		// 이 클라이언트가 보내는 모든 요청에 캐시를 명시적으로 꺼서 근본적으로 막는다.
		fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
	},
});
