import { supabase } from '@/lib/supabase';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

export async function GET() {
	const { data: Schedule, error } = await supabase.from('Schedule').select('*');

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
