import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 신규 가입 시 초대코드를 검증/소비한다.
// - 지금까지 발급된 초대코드가 하나도 없으면(=아직 아무도 앱 소유자로 자리잡지 않음) 첫 계정은 코드 없이 통과시킨다.
// - 이후에는 유효하고 아직 사용되지 않은 코드가 있어야만 통과된다.
export async function POST(request) {
	const { code, email } = await request.json();

	const { count, error: countError } = await supabase
		.from('InviteCodes')
		.select('id', { count: 'exact', head: true });

	if (countError || count === null) {
		console.error('초대코드 확인 실패:', countError);
		return new NextResponse(JSON.stringify({ ok: false, message: '초대코드 확인에 실패했습니다. (InviteCodes 테이블이 없을 수 있습니다)' }), { status: 500 });
	}

	// 아직 발급된 초대코드가 없는 상태 = 최초 가입(앱 소유자) → 무조건 통과
	if (count === 0) {
		return new NextResponse(JSON.stringify({ ok: true, bootstrap: true }), { status: 200 });
	}

	if (!code) {
		return new NextResponse(JSON.stringify({ ok: false, message: '초대코드가 필요합니다.' }), { status: 400 });
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

	return new NextResponse(JSON.stringify({ ok: true }), { status: 200 });
}
