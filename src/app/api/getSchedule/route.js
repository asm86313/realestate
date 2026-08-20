import { supabase } from '@/lib/supabase';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

export async function GET(request) {
	const user = await requireUser(request);
	if (!user) {
		return new Response(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = resolveOwnerId(user);

	const { data: Schedule, error } = await supabase.from('Schedule').select('*').eq('ownerId', ownerId);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	Schedule.forEach((s) => {
		s.title = s.description;
	});

	return new Response(JSON.stringify({ Schedule }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}
