import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

// 요약표(카테고리) 표시 순서만 바꾼다 - 위/아래 버튼으로 인접한 두 개를 스왑할 때 쓴다.
// 제목/그룹/내역은 전혀 안 건드리고 sortOrder만 갱신한다.
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

	// 이 건물이 우리 가족 소유가 맞는지 확인
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

	// 순서를 바꿀 요약표들이 전부 이 건물 것인지 확인 (다른 건물 요약표를 슬쩍 건드리는 걸 막는다).
	const ids = updates.map((u) => u.id);
	const { data: owned, error: ownedError } = await supabaseAdmin
		.from('LedgerReports')
		.select('id')
		.eq('bldId', bldId)
		.in('id', ids);

	if (ownedError) {
		console.error('요약표 확인 실패:', ownedError);
		return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
	}
	if (!owned || owned.length !== ids.length) {
		return new NextResponse(JSON.stringify({ message: '유효하지 않은 요약표가 있습니다.' }), { status: 400 });
	}

	for (const u of updates) {
		const { error } = await supabaseAdmin.from('LedgerReports').update({ sortOrder: u.sortOrder }).eq('id', u.id);
		if (error) {
			console.error('요약표 순서 저장 실패:', error);
			return new NextResponse(JSON.stringify({ message: '순서 저장에 실패했습니다.' }), { status: 500 });
		}
	}

	return new NextResponse(JSON.stringify({ message: '순서가 저장되었습니다.' }), { status: 200 });
}
