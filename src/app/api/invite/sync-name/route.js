import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 가족회원이 자기 이름을 바꾸면, 대표가 보는 가족회원 목록에도 같이 반영되도록
// InviteCodes의 memberName을 동기화한다.
export async function POST(request) {
	const { code, name } = await request.json();

	if (!code) {
		return new NextResponse(JSON.stringify({ message: '코드가 필요합니다.' }), { status: 400 });
	}

	const { error } = await supabase
		.from('InviteCodes')
		.update({ memberName: name })
		.eq('code', code.trim().toUpperCase());

	if (error) {
		console.error('이름 동기화 실패:', error);
		return new NextResponse(JSON.stringify({ message: '이름 동기화에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ ok: true }), { status: 200 });
}
