import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

// 건물별 커스텀 회계 요약표(리포트) 목록을 가져온다.
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

	const { data, error } = await supabaseAdmin
		.from('LedgerReports')
		.select('*, items:LedgerReportItems(*)')
		.eq('bldId', bldId)
		.order('createdAt', { ascending: false });

	if (error) {
		console.error('회계 요약표 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '조회에 실패했습니다.' }), { status: 500 });
	}

	// items는 embed 순서가 보장되지 않아서 sortOrder로 직접 정렬해준다.
	const reports = (data || []).map((r) => ({
		...r,
		items: (r.items || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
	}));

	return new NextResponse(JSON.stringify({ reports }), { status: 200 });
}

// 요약표 등록/수정. items는 매번 통째로 교체한다(삭제 후 재삽입).
export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { report } = await request.json();

	if (!report || !report.bldId || !report.title?.trim()) {
		return new NextResponse(JSON.stringify({ message: '건물과 제목은 필수입니다.' }), { status: 400 });
	}

	// 내역 없이 이름만 있는 "껍데기" 요약표도 저장할 수 있다 - 나중에 수정해서 채우면 된다.
	const items = Array.isArray(report.items) ? report.items : [];

	// 이 건물이 우리 가족 소유가 맞는지 확인
	const { data: bld, error: bldError } = await supabaseAdmin
		.from('Buildings')
		.select('id')
		.eq('id', report.bldId)
		.eq('ownerId', ownerId)
		.maybeSingle();

	if (bldError) {
		console.error('건물 확인 실패:', bldError);
		return new NextResponse(JSON.stringify({ message: '건물 확인에 실패했습니다.' }), { status: 500 });
	}
	if (!bld) {
		return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
	}

	const title = report.title.trim();
	// 그룹도 이제 요약표 하나가 여러 개에 동시에 속할 수 있다. groupNames(배열)를 기본으로 받고,
	// 옛 방식으로 groupName(단일)만 보내는 곳이 있으면 그것도 합쳐준다.
	const groupNames = Array.from(
		new Set(
			[...(Array.isArray(report.groupNames) ? report.groupNames : []), ...(report.groupName ? [report.groupName] : [])]
				.map((g) => String(g || '').trim())
				.filter(Boolean)
		)
	);
	// 옛 단일 groupName 컬럼도 참고용으로 첫 번째 그룹으로 채워둔다(화면은 이제 안 읽음).
	const groupName = groupNames[0] || null;
	let reportId;
	let isExistingReport;

	if (report.id) {
		// 기존 요약표를 수정하는 경우, 그 요약표도 우리 가족 소유 건물의 것인지 확인
		const { data: existing, error: existingError } = await supabaseAdmin
			.from('LedgerReports')
			.select('id, Buildings!inner(ownerId)')
			.eq('id', report.id)
			.eq('Buildings.ownerId', ownerId)
			.maybeSingle();

		if (existingError) {
			console.error('회계 요약표 확인 실패:', existingError);
			return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
		}
		if (!existing) {
			return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
		}

		const { error: updateError } = await supabaseAdmin.from('LedgerReports').update({ title, groupName, groupNames }).eq('id', report.id);
		if (updateError) {
			console.error('회계 요약표 저장 실패:', updateError);
			// 23505 = unique_violation: 같은 건물에 이미 그 이름의 요약표(카테고리)가 있는 경우.
			if (updateError.code === '23505') {
				return new NextResponse(JSON.stringify({ message: '이미 같은 이름의 카테고리가 있어요. 다른 이름을 써주세요.' }), { status: 409 });
			}
			return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
		}
		reportId = report.id;
		isExistingReport = true;
	} else {
		// 새로 만드는 경우, 같은 건물에 같은 제목의 요약표가 이미 있으면(카테고리로 자동 생성된 것 포함)
		// 새로 만들지 않고 그걸 그대로 재사용한다 - "카테고리 = 요약표 이름"이 항상 유지되게.
		const { data: existingByTitle, error: findError } = await supabaseAdmin
			.from('LedgerReports')
			.select('id')
			.eq('bldId', report.bldId)
			.eq('title', title)
			.maybeSingle();

		if (findError) {
			console.error('회계 요약표 확인 실패:', findError);
			return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
		}

		if (existingByTitle) {
			reportId = existingByTitle.id;
			isExistingReport = true;

			const { error: updateError } = await supabaseAdmin.from('LedgerReports').update({ groupName, groupNames }).eq('id', reportId);
			if (updateError) {
				console.error('회계 요약표 그룹 갱신 실패:', updateError);
				return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
			}
		} else {
			const { data: inserted, error: insertError } = await supabaseAdmin
				.from('LedgerReports')
				.insert({ bldId: report.bldId, title, groupName, groupNames })
				.select('id')
				.single();

			if (insertError) {
				console.error('회계 요약표 저장 실패:', insertError);
				return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
			}
			reportId = inserted.id;
			isExistingReport = false;
		}
	}

	// 기존 요약표를 재사용/수정하는 경우, 수동으로 넣어둔 줄을 전부 지우고 새로 넣는다
	// (순서 변경/삭제까지 한 번에 반영하기 위함). 카테고리로 연결된 내역(reportId)은
	// LedgerReportItems가 아니라 Ledger 쪽 데이터라 여기서 지워지지 않는다.
	if (isExistingReport) {
		const { error: delError } = await supabaseAdmin.from('LedgerReportItems').delete().eq('reportId', reportId);
		if (delError) {
			console.error('회계 요약표 기존 내역 삭제 실패:', delError);
			return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
		}
	}

	const itemPayload = items.map((item, index) => ({
		reportId,
		label: String(item.label || '').trim() || '(내용 없음)',
		amount: Number(item.amount) || 0,
		notes: item.notes || null,
		ledgerId: item.ledgerId || null,
		sortOrder: index,
	}));

	// 내역이 하나도 없으면(껍데기 요약표) insert할 게 없으니 건너뛴다 - 빈 배열을 넣으면 그냥 no-op이지만 명시적으로 스킵한다.
	if (itemPayload.length > 0) {
		const { error: itemsError } = await supabaseAdmin.from('LedgerReportItems').insert(itemPayload);

		if (itemsError) {
			console.error('회계 요약표 내역 저장 실패:', itemsError);
			return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
		}
	}

	return new NextResponse(JSON.stringify({ message: '저장되었습니다.', id: reportId }), { status: 200 });
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

	// 삭제 대상이 우리 가족 소유 건물의 요약표인지 확인
	const { data: existing, error: existingError } = await supabaseAdmin
		.from('LedgerReports')
		.select('id, Buildings!inner(ownerId)')
		.eq('id', id)
		.eq('Buildings.ownerId', ownerId)
		.maybeSingle();

	if (existingError) {
		console.error('회계 요약표 확인 실패:', existingError);
		return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
	}
	if (!existing) {
		return new NextResponse(JSON.stringify({ message: '권한이 없거나 존재하지 않는 요약표입니다.' }), { status: 403 });
	}

	// LedgerReportItems는 on delete cascade라 같이 지워진다.
	const { error } = await supabaseAdmin.from('LedgerReports').delete().eq('id', id);

	if (error) {
		console.error('회계 요약표 삭제 실패:', error);
		return new NextResponse(JSON.stringify({ message: '삭제에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '삭제되었습니다.' }), { status: 200 });
}
