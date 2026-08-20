import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';
import { codeToEmail } from '@/utils/familyCode';

function generateCode() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 문자(0,O,1,I) 제외
	let code = '';
	for (let i = 0; i < 8; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

// 로그인한 사용자가 가족코드를 발급한다.
// 이 코드는 곧 "비밀번호"가 되어, 이 코드를 아는 사람은 누구나 별도 이메일 인증 없이 로그인할 수 있다.
export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	// 가족대표만 초대코드/가족코드를 발급할 수 있다.
	if (ownerId !== user.id) {
		return new NextResponse(JSON.stringify({ message: '가족대표만 발급할 수 있습니다.' }), { status: 403 });
	}

	const { email } = await request.json();

	if (!email) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}

	const code = generateCode();

	// 가족코드 전용 로그인 계정 생성 (비밀번호 = 코드)
	// 서버에서 만드는 계정이므로 admin.createUser를 쓴다. signUp과 달리 세션을 만들지 않고,
	// email_confirm으로 즉시 인증 처리한다 (familycode.internal은 실제 메일함이 아니라 확인 메일을 받을 수 없다).
	//
	// 소속(어느 가족인지)은 user_metadata가 아니라 FamilyMembers 테이블에 기록한다.
	// user_metadata는 로그인한 본인이 고칠 수 있어서 소속 근거로 쓸 수 없다.
	const { data: created, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
		email: codeToEmail(code),
		password: code,
		email_confirm: true,
		user_metadata: { role: 'member', code },
	});

	if (signUpError || !created?.user) {
		console.error('가족코드 계정 생성 실패:', signUpError);
		return new NextResponse(JSON.stringify({ message: '가족코드 발급에 실패했습니다.' }), { status: 500 });
	}

	const { error: memberError } = await supabaseAdmin.from('FamilyMembers').insert({
		userId: created.user.id,
		ownerId,
	});

	if (memberError) {
		console.error('가족 소속 기록 실패:', memberError);
		return new NextResponse(JSON.stringify({ message: '가족코드 발급에 실패했습니다.' }), { status: 500 });
	}

	const { error } = await supabaseAdmin.from('InviteCodes').insert({
		ownerId,
		code,
		createdByEmail: email,
	});

	if (error) {
		console.error('초대코드 기록 실패:', error);
		return new NextResponse(JSON.stringify({ message: '초대코드 발급에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ code }), { status: 200 });
}
