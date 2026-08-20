import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

export async function GET() {
	const { data, error } = await supabase
		.from('LedgerTemplates')
		.select('*')
		.order('dayOfMonth', { ascending: true });

	if (error) {
		console.error('반복 장부 템플릿 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '조회에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ templates: data }), { status: 200 });
}

export async function POST(request) {
	const { template } = await request.json();

	if (!template || !template.bldId || !template.dayOfMonth) {
		return new NextResponse(JSON.stringify({ message: '건물과 매월 며칠인지는 필수입니다.' }), { status: 400 });
	}

	const payload = {
		bldId: template.bldId,
		purpose: template.purpose || null,
		income: template.income === '' || template.income == null ? null : Number(template.income),
		expense: template.expense === '' || template.expense == null ? null : Number(template.expense),
		interestRate: template.interestRate === '' || template.interestRate == null ? null : Number(template.interestRate),
		interestAmount: template.interestAmount === '' || template.interestAmount == null ? null : Number(template.interestAmount),
		borrowedDays: template.borrowedDays === '' || template.borrowedDays == null ? null : Number(template.borrowedDays),
		notes: template.notes || null,
		dayOfMonth: Number(template.dayOfMonth),
		active: template.active ?? true,
		skipHoliday: template.skipHoliday ?? false,
	};
	if (template.id) payload.id = template.id;

	const { error } = await supabase.from('LedgerTemplates').upsert(payload, { onConflict: ['id'] });

	if (error) {
		console.error('반복 장부 템플릿 저장 실패:', error);
		return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '저장되었습니다.' }), { status: 200 });
}

export async function DELETE(request) {
	const { id } = await request.json();

	if (!id) {
		return new NextResponse(JSON.stringify({ message: '삭제할 항목 ID가 없습니다.' }), { status: 400 });
	}

	const { error } = await supabase.from('LedgerTemplates').delete().eq('id', id);

	if (error) {
		console.error('반복 장부 템플릿 삭제 실패:', error);
		return new NextResponse(JSON.stringify({ message: '삭제에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '삭제되었습니다.' }), { status: 200 });
}
