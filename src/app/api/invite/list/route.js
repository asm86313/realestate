import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

// 가족대표가 지금까지 발급한 가족회원 코드 목록을 조회한다.
export async function GET(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { data, error } = await supabaseAdmin
		.from('InviteCodes')
		.select('id, code, memberName, revoked, createdAt')
		.eq('ownerId', ownerId)
		.order('createdAt', { ascending: false });

	if (error) {
		console.error('가족회원 목록 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '가족회원 목록 조회에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ members: data }), { status: 200 });
}
