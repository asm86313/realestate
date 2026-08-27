import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

// 건물별 요약표 그룹 이름 + 표시 순서 목록을 가져온다.
// 그룹 자체는 요약표(LedgerReports.groupNames)에 이름으로만 저장되고, 여기 이 테이블은
// 순서를 매길 수 있도록 그 이름들을 별도로 붙잡아두는 용도다(요약표 저장 때 자동 생성됨).
export async function GET(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { searchParams } = new URL(request.url);
	const bldId = searchParams.get('bldId');

	if (!bldId) {
		return new NextResponse(JSON.stringify({ message: 'bldId가 필요합니다.' }), { status: 400 });
	}

	const { data: bld, error: bldError } = await supabaseAdmin
		.from('Buildings')
		.select('id')
		.eq('id', bldId)
		.eq('ownerId', ownerId)
		.maybeSingle();

	if (bldError) {
		console.error('건물 확인 실패:', bldError);
		return new NextResponse(JSON.stringify({ message: '건물 확인에 실패했습니다.' }), { status: 500 });
	}
	if (!bld) {
		return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
	}

	const { data, error } = await supabaseAdmin
		.from('LedgerReportGroups')
		.select('*')
		.eq('bldId', bldId)
		.order('sortOrder', { ascending: true });

	if (error) {
		console.error('그룹 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '조회에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ groups: data || [] }), { status: 200 });
}

// 그룹 표시 순서만 바꾼다 - 위/아래 버튼으로 인접한 두 그룹을 스왑할 때 쓴다.
export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { bldId, updates } = await request.json();

	if (!bldId || !Array.isArray(updates) || updates.length === 0) {
		return new NextResponse(JSON.stringify({ message: 'bldId와 updates가 필요합니다.' }), { status: 400 });
	}

	const { data: bld, error: bldError } = await supabaseAdmin
		.from('Buildings')
		.select('id')
		.eq('id', bldId)
		.eq('ownerId', ownerId)
		.maybeSingle();

	if (bldError) {
		console.error('건물 확인 실패:', bldError);
		return new NextResponse(JSON.stringify({ message: '건물 확인에 실패했습니다.' }), { status: 500 });
	}
	if (!bld) {
		return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
	}

	for (const u of updates) {
		const { error } = await supabaseAdmin
			.from('LedgerReportGroups')
			.update({ sortOrder: u.sortOrder })
			.eq('bldId', bldId)
			.eq('name', u.name);
		if (error) {
			console.error('그룹 순서 저장 실패:', error);
			return new NextResponse(JSON.stringify({ message: '순서 저장에 실패했습니다.' }), { status: 500 });
		}
	}

	return new NextResponse(JSON.stringify({ message: '순서가 저장되었습니다.' }), { status: 200 });
}
