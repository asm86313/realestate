import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// 가족대표가 가족회원을 삭제(코드 폐기)한다.
// 실제 Supabase Auth 계정을 지우려면 관리자 권한(service role)이 필요해서,
// 대신 해당 코드를 폐기 처리해 그 코드로는 더 이상 로그인할 수 없게 막는다.
export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = resolveOwnerId(user);

	const { code } = await request.json();

	if (!code) {
		return new NextResponse(JSON.stringify({ message: '코드가 필요합니다.' }), { status: 400 });
	}

	// 내 가족이 발급한 코드만 폐기할 수 있다.
	const { error } = await supabase
		.from('InviteCodes')
		.update({ revoked: true })
		.eq('code', code.trim().toUpperCase())
		.eq('ownerId', ownerId);

	if (error) {
		console.error('가족회원 삭제 실패:', error);
		return new NextResponse(JSON.stringify({ message: '가족회원 삭제에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ ok: true }), { status: 200 });
}
