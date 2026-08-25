import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

export async function GET(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { data, error } = await supabaseAdmin
		.from('LedgerTemplates')
		.select('*')
		.eq('ownerId', ownerId)
		.order('dayOfMonth', { ascending: true });

	if (error) {
		console.error('반복 장부 템플릿 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '조회에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ templates: data }), { status: 200 });
}

export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { template } = await request.json();

	if (!template || !template.bldId || !template.dayOfMonth) {
		return new NextResponse(JSON.stringify({ message: '건물과 매월 며칠인지는 필수입니다.' }), { status: 400 });
	}

	// 기존 템플릿을 수정하는 경우, 우리 가족 소유가 맞는지 먼저 확인
	if (template.id) {
		const { data: existing, error: existingError } = await supabaseAdmin
			.from('LedgerTemplates')
			.select('ownerId')
			.eq('id', template.id)
			.maybeSingle();

		if (existingError) {
			console.error('반복 장부 템플릿 확인 실패:', existingError);
			return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
		}
		if (!existing || existing.ownerId !== ownerId) {
			return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
		}
	}

	// reportId(카테고리로 고른 요약표)를 넣는 경우, 같은 건물 것인지 확인
	if (template.reportId) {
		const { data: rpt, error: rptError } = await supabaseAdmin
			.from('LedgerReports')
			.select('id')
			.eq('id', template.reportId)
			.eq('bldId', template.bldId)
			.maybeSingle();

		if (rptError) {
			console.error('요약표 확인 실패:', rptError);
			return new NextResponse(JSON.stringify({ message: '요약표 확인에 실패했습니다.' }), { status: 500 });
		}
		if (!rpt) {
			return new NextResponse(JSON.stringify({ message: '유효하지 않은 요약표입니다.' }), { status: 400 });
		}
	}

	// 통장도 같은 건물 것인지 확인
	if (template.bankAccountId) {
		const { data: acc, error: accError } = await supabaseAdmin
			.from('BankAccounts')
			.select('id')
			.eq('id', template.bankAccountId)
			.eq('bldId', template.bldId)
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
		ownerId,
		bldId: template.bldId,
		purpose: template.purpose || null,
		income: template.income === '' || template.income == null ? null : Number(template.income),
		expense: template.expense === '' || template.expense == null ? null : Number(template.expense),
		interestRate: template.interestRate === '' || template.interestRate == null ? null : Number(template.interestRate),
		interestAmount: template.interestAmount === '' || template.interestAmount == null ? null : Number(template.interestAmount),
		borrowedDays: template.borrowedDays === '' || template.borrowedDays == null ? null : Number(template.borrowedDays),
		interestAuto: template.interestAuto ?? false,
		notes: template.notes || null,
		bankAccountId: template.bankAccountId || null,
		reportId: template.reportId || null,
		dayOfMonth: Number(template.dayOfMonth),
		active: template.active ?? true,
		skipHoliday: template.skipHoliday ?? false,
	};
	if (template.id) payload.id = template.id;

	const { error } = await supabaseAdmin.from('LedgerTemplates').upsert(payload, { onConflict: ['id'] });

	if (error) {
		console.error('반복 장부 템플릿 저장 실패:', error);
		return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
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

	const { error } = await supabaseAdmin.from('LedgerTemplates').delete().eq('id', id).eq('ownerId', ownerId);

	if (error) {
		console.error('반복 장부 템플릿 삭제 실패:', error);
		return new NextResponse(JSON.stringify({ message: '삭제에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '삭제되었습니다.' }), { status: 200 });
}
