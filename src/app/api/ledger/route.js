import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

// 건물별(bldId) 또는 특정 날짜(date) 기준으로 장부 목록을 가져온다. 최소 하나는 필요하다.
// Ledger 자체엔 ownerId가 없어서, 소속 건물(Buildings)의 ownerId로 걸러낸다.
export async function GET(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { searchParams } = new URL(request.url);
	const bldId = searchParams.get('bldId');
	const date = searchParams.get('date');

	if (!bldId && !date) {
		return new NextResponse(JSON.stringify({ message: 'bldId 또는 date가 필요합니다.' }), { status: 400 });
	}

	let query = supabaseAdmin
		.from('Ledger')
		.select('*, Buildings!inner(address, ownerId), LedgerReportLinks(reportId)')
		.eq('Buildings.ownerId', ownerId)
		.order('date', { ascending: true })
		.order('id', { ascending: true });

	if (bldId) query = query.eq('bldId', bldId);
	if (date) query = query.eq('date', date);

	const { data, error } = await query;

	if (error) {
		console.error('장부 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '장부 조회에 실패했습니다.' }), { status: 500 });
	}

	// 내역 하나가 카테고리(요약표) 여러 개에 속할 수 있어서, 연결 테이블(LedgerReportLinks)에서
	// 온 걸 reportIds 배열로 펴서 내려준다. 옛 reportId(단일) 컬럼은 그대로 같이 내려가지만
	// 화면에서는 이제 안 쓰고 reportIds만 본다.
	const ledger = (data || []).map(({ LedgerReportLinks, ...row }) => ({
		...row,
		reportIds: (LedgerReportLinks || []).map((l) => l.reportId),
	}));

	return new NextResponse(JSON.stringify({ ledger }), { status: 200 });
}

// 장부 항목 등록/수정
export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { entry } = await request.json();

	if (!entry || !entry.bldId) {
		return new NextResponse(JSON.stringify({ message: '건물 정보가 없습니다.' }), { status: 400 });
	}

	// 이 건물이 우리 가족 소유가 맞는지 확인
	const { data: bld, error: bldError } = await supabaseAdmin
		.from('Buildings')
		.select('id')
		.eq('id', entry.bldId)
		.eq('ownerId', ownerId)
		.maybeSingle();

	if (bldError) {
		console.error('건물 확인 실패:', bldError);
		return new NextResponse(JSON.stringify({ message: '건물 확인에 실패했습니다.' }), { status: 500 });
	}
	if (!bld) {
		return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
	}

	// 카테고리(요약표)는 이제 내역 하나당 여러 개 고를 수 있다. reportIds(배열)를 기본으로 받고,
	// 옛 방식으로 reportId(단일)만 보내는 곳(반복 템플릿 등)이 있으면 그것도 배열로 합쳐준다.
	const reportIds = Array.from(
		new Set([...(Array.isArray(entry.reportIds) ? entry.reportIds : []), ...(entry.reportId ? [entry.reportId] : [])].filter(Boolean))
	);

	// 고른 요약표들이 전부 같은 건물 것인지 확인 (다른 건물/가족 요약표에 슬쩍 연결하는 걸 막는다).
	if (reportIds.length > 0) {
		const { data: rpts, error: rptError } = await supabaseAdmin
			.from('LedgerReports')
			.select('id')
			.eq('bldId', entry.bldId)
			.in('id', reportIds);

		if (rptError) {
			console.error('요약표 확인 실패:', rptError);
			return new NextResponse(JSON.stringify({ message: '요약표 확인에 실패했습니다.' }), { status: 500 });
		}
		if (!rpts || rpts.length !== reportIds.length) {
			return new NextResponse(JSON.stringify({ message: '유효하지 않은 요약표입니다.' }), { status: 400 });
		}
	}

	// 통장도 같은 건물 것인지 확인 (통장은 카테고리처럼 건물 단위)
	if (entry.bankAccountId) {
		const { data: acc, error: accError } = await supabaseAdmin
			.from('BankAccounts')
			.select('id')
			.eq('id', entry.bankAccountId)
			.eq('bldId', entry.bldId)
			.maybeSingle();

		if (accError) {
			console.error('통장 확인 실패:', accError);
			return new NextResponse(JSON.stringify({ message: '통장 확인에 실패했습니다.' }), { status: 500 });
		}
		if (!acc) {
			return new NextResponse(JSON.stringify({ message: '유효하지 않은 통장입니다.' }), { status: 400 });
		}
	}

	const payload = {
		bldId: entry.bldId,
		date: entry.date || null,
		purpose: entry.purpose || null,
		income: entry.income || null,
		expense: entry.expense || null,
		interestRate: entry.interestRate || null,
		interestAmount: entry.interestAmount || null,
		borrowedDays: entry.borrowedDays || null,
		interestAuto: entry.interestAuto ?? false,
		notes: entry.notes || null,
		// 옛 단일 reportId 컬럼도 참고용으로 첫 번째 카테고리로 채워둔다(화면은 이제 안 읽음).
		reportId: reportIds[0] ?? null,
		bankAccountId: entry.bankAccountId || null,
	};
	if (entry.id) payload.id = entry.id;

	const { data: savedRows, error } = await supabaseAdmin.from('Ledger').upsert(payload, { onConflict: ['id'] }).select('id');

	if (error) {
		console.error('장부 저장 실패:', error);
		return new NextResponse(JSON.stringify({ message: '장부 저장에 실패했습니다.' }), { status: 500 });
	}

	// 카테고리 다중 연결 동기화: 이 내역의 연결을 전부 지우고 이번에 고른 것들로 다시 채운다
	// (통째로 다시 쓰는 방식이라 순서 상관없이 항상 최종 선택 그대로 반영된다).
	const ledgerId = entry.id || savedRows?.[0]?.id;
	if (ledgerId) {
		const { error: unlinkError } = await supabaseAdmin.from('LedgerReportLinks').delete().eq('ledgerId', ledgerId);
		if (unlinkError) {
			console.error('카테고리 연결 초기화 실패:', unlinkError);
			return new NextResponse(JSON.stringify({ message: '카테고리 연결에 실패했습니다.' }), { status: 500 });
		}
		if (reportIds.length > 0) {
			const { error: linkError } = await supabaseAdmin
				.from('LedgerReportLinks')
				.insert(reportIds.map((reportId) => ({ ledgerId, reportId })));
			if (linkError) {
				console.error('카테고리 연결 실패:', linkError);
				return new NextResponse(JSON.stringify({ message: '카테고리 연결에 실패했습니다.' }), { status: 500 });
			}
		}
	}

	return new NextResponse(JSON.stringify({ message: '저장되었습니다.' }), { status: 200 });
}

export async function DELETE(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { id } = await request.json();

	if (!id) {
		return new NextResponse(JSON.stringify({ message: '삭제할 항목 ID가 없습니다.' }), { status: 400 });
	}

	// 삭제 대상 항목이 우리 가족 소유 건물에 속하는지 확인
	const { data: existing, error: existingError } = await supabaseAdmin
		.from('Ledger')
		.select('id, Buildings!inner(ownerId)')
		.eq('id', id)
		.eq('Buildings.ownerId', ownerId)
		.maybeSingle();

	if (existingError) {
		console.error('장부 항목 확인 실패:', existingError);
		return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
	}
	if (!existing) {
		return new NextResponse(JSON.stringify({ message: '권한이 없거나 존재하지 않는 항목입니다.' }), { status: 403 });
	}

	const { error } = await supabaseAdmin.from('Ledger').delete().eq('id', id);

	if (error) {
		console.error('장부 삭제 실패:', error);
		return new NextResponse(JSON.stringify({ message: '삭제에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '삭제되었습니다.' }), { status: 200 });
}
