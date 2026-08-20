import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

export async function GET(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = resolveOwnerId(user);

	const { data, error } = await supabase
		.from('ScheduleTemplates')
		.select('*')
		.eq('ownerId', ownerId)
		.order('dayOfMonth', { ascending: true });

	if (error) {
		console.error('반복 일정 템플릿 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '조회에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ templates: data }), { status: 200 });
}

export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = resolveOwnerId(user);

	const { template } = await request.json();

	if (!template || !template.dayOfMonth) {
		return new NextResponse(JSON.stringify({ message: '매월 며칠인지 입력해주세요.' }), { status: 400 });
	}

	// 기존 템플릿을 수정하는 경우, 우리 가족 소유가 맞는지 먼저 확인
	if (template.id) {
		const { data: existing, error: existingError } = await supabase
			.from('ScheduleTemplates')
			.select('ownerId')
			.eq('id', template.id)
			.maybeSingle();

		if (existingError) {
			console.error('반복 일정 템플릿 확인 실패:', existingError);
			return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
		}
		if (!existing || existing.ownerId !== ownerId) {
			return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
		}
	}

	const payload = {
		ownerId,
		bldId: template.bldId || null,
		description: template.description || null,
		notes: template.notes || null,
		dayOfMonth: Number(template.dayOfMonth),
		active: template.active ?? true,
		skipHoliday: template.skipHoliday ?? false,
	};
	if (template.id) payload.id = template.id;

	const { error } = await supabase.from('ScheduleTemplates').upsert(payload, { onConflict: ['id'] });

	if (error) {
		console.error('반복 일정 템플릿 저장 실패:', error);
		return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '저장되었습니다.' }), { status: 200 });
}

export async function DELETE(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = resolveOwnerId(user);

	const { id } = await request.json();

	if (!id) {
		return new NextResponse(JSON.stringify({ message: '삭제할 항목 ID가 없습니다.' }), { status: 400 });
	}

	const { error } = await supabase.from('ScheduleTemplates').delete().eq('id', id).eq('ownerId', ownerId);

	if (error) {
		console.error('반복 일정 템플릿 삭제 실패:', error);
		return new NextResponse(JSON.stringify({ message: '삭제에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '삭제되었습니다.' }), { status: 200 });
}
