import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireUser } from '@/lib/apiAuth';

// 신규 가입 시 초대코드를 검증/소비한다.
// - 초대코드를 입력하지 않으면: 새로운 가족(워크스페이스)의 대표로 가입 (bootstrap)
// - 초대코드를 입력하면: 그 코드를 발급한 가족의 구성원으로 합류 (유효하고 아직 미사용이어야 함)
// (verifyOtp 직후 호출되므로 이 시점엔 이미 Supabase 세션이 생성돼 있다.)
export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ ok: false, message: '로그인이 필요합니다.' }), { status: 401 });
	}

	const { code, email } = await request.json();

	// 초대코드 없이 가입 = 새로운 가족의 대표
	if (!code) {
		return new NextResponse(JSON.stringify({ ok: true, bootstrap: true }), { status: 200 });
	}

	const { data: invite, error: findError } = await supabase
		.from('InviteCodes')
		.select('*')
		.eq('code', code.trim().toUpperCase())
		.is('usedByEmail', null)
		.maybeSingle();

	if (findError) {
		console.error('초대코드 조회 실패:', findError);
		return new NextResponse(JSON.stringify({ ok: false, message: '초대코드 확인에 실패했습니다.' }), { status: 500 });
	}

	if (!invite) {
		return new NextResponse(JSON.stringify({ ok: false, message: '유효하지 않거나 이미 사용된 초대코드입니다.' }), { status: 400 });
	}

	const { error: updateError } = await supabase
		.from('InviteCodes')
		.update({ usedByEmail: email, usedAt: new Date().toISOString() })
		.eq('id', invite.id);

	if (updateError) {
		console.error('초대코드 사용 처리 실패:', updateError);
		return new NextResponse(JSON.stringify({ ok: false, message: '초대코드 처리에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ ok: true, familyOwnerId: invite.ownerId }), { status: 200 });
}
