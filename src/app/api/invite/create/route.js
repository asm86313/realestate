import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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
	const ownerId = resolveOwnerId(user);

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
	// role: 'member'와 code, familyOwnerId(=이 대표의 UID)를 함께 저장해서
	// 이 계정으로 로그인하면 바로 대표의 가족 데이터에 접근하게 한다.
	const { error: signUpError } = await supabase.auth.signUp({
		email: codeToEmail(code),
		password: code,
		options: {
			data: { role: 'member', code, familyOwnerId: ownerId },
		},
	});

	if (signUpError) {
		console.error('가족코드 계정 생성 실패:', signUpError);
		return new NextResponse(JSON.stringify({ message: '가족코드 발급에 실패했습니다.' }), { status: 500 });
	}

	const { error } = await supabase.from('InviteCodes').insert({
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
