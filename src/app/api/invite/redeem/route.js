import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
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

	// 초대코드 없이 가입 = 새로운 가족의 대표.
	// FamilyMembers에 아무것도 넣지 않으면 resolveOwnerId가 본인 UID를 대표로 본다.
	// 그 조회조차 매번 하지 않도록 여기서 미리 본인 UID로 캐싱해둔다(실패해도 치명적이지 않음).
	if (!code) {
		const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
			app_metadata: { ...user.app_metadata, ownerId: user.id },
		});
		if (metaError) {
			console.error('ownerId 캐싱 실패(다음 요청에서 재시도됨):', metaError);
		}
		return new NextResponse(JSON.stringify({ ok: true, bootstrap: true }), { status: 200 });
	}

	// 이미 어느 가족에 속해 있으면 다른 가족으로 갈아탈 수 없다.
	const { data: existing, error: existingError } = await supabaseAdmin
		.from('FamilyMembers')
		.select('ownerId')
		.eq('userId', user.id)
		.maybeSingle();

	if (existingError) {
		console.error('가족 소속 조회 실패:', existingError);
		return new NextResponse(JSON.stringify({ ok: false, message: '초대코드 확인에 실패했습니다.' }), { status: 500 });
	}

	if (existing) {
		return new NextResponse(JSON.stringify({ ok: false, message: '이미 가족에 속해 있는 계정입니다.' }), { status: 400 });
	}

	const { data: invite, error: findError } = await supabaseAdmin
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

	if (invite.revoked) {
		return new NextResponse(JSON.stringify({ ok: false, message: '삭제된 초대코드입니다.' }), { status: 400 });
	}

	// 소속을 서버 전용 테이블에 기록한다. 이게 이 계정의 유일한 가족 소속 근거다.
	const { error: memberError } = await supabaseAdmin.from('FamilyMembers').insert({
		userId: user.id,
		ownerId: invite.ownerId,
	});

	if (memberError) {
		console.error('가족 소속 기록 실패:', memberError);
		return new NextResponse(JSON.stringify({ ok: false, message: '초대코드 처리에 실패했습니다.' }), { status: 500 });
	}

	// resolveOwnerId가 매 요청 FamilyMembers를 다시 조회하지 않도록 여기서 미리 캐싱해둔다.
	// (실패해도 치명적이지 않다 - resolveOwnerId가 다음 요청에서 알아서 조회 후 재캐싱한다)
	const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
		app_metadata: { ...user.app_metadata, ownerId: invite.ownerId },
	});
	if (metaError) {
		console.error('ownerId 캐싱 실패(다음 요청에서 재시도됨):', metaError);
	}

	const { error: updateError } = await supabaseAdmin
		.from('InviteCodes')
		.update({ usedByEmail: email, usedAt: new Date().toISOString() })
		.eq('id', invite.id);

	if (updateError) {
		console.error('초대코드 사용 처리 실패:', updateError);
		return new NextResponse(JSON.stringify({ ok: false, message: '초대코드 처리에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ ok: true, familyOwnerId: invite.ownerId }), { status: 200 });
}
