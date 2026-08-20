import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser } from '@/lib/apiAuth';

// 가족코드 로그인 시, 대표가 이 코드를 폐기(삭제)했는지 확인한다.
// (signInWithPassword 직후 호출되므로 이 시점엔 이미 Supabase 세션이 생성돼 있다.)
export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ revoked: true, message: '로그인이 필요합니다.' }), { status: 401 });
	}

	const { code } = await request.json();

	if (!code) {
		return new NextResponse(JSON.stringify({ revoked: true, message: '코드가 없습니다.' }), { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from('InviteCodes')
		.select('revoked')
		.eq('code', code.trim().toUpperCase())
		.maybeSingle();

	if (error) {
		console.error('가족코드 상태 확인 실패:', error);
		return new NextResponse(JSON.stringify({ revoked: true, message: '코드 확인에 실패했습니다.' }), { status: 500 });
	}

	// InviteCodes에 기록이 없는 코드(예: 최초 소유자 계정)는 폐기 대상이 아니다.
	const revoked = data?.revoked ?? false;

	return new NextResponse(JSON.stringify({ revoked }), { status: 200 });
}
