import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

// 가족대표가 지금까지 발급한 가족회원 코드 목록을 조회한다.
export async function GET() {
	const { data, error } = await supabase
		.from('InviteCodes')
		.select('id, code, memberName, revoked, createdAt')
		.order('createdAt', { ascending: false });

	if (error) {
		console.error('가족회원 목록 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '가족회원 목록 조회에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ members: data }), { status: 200 });
}
