import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

// 건물별(bldId) 또는 특정 날짜(date) 기준으로 장부 목록을 가져온다. 최소 하나는 필요하다.
export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const bldId = searchParams.get('bldId');
	const date = searchParams.get('date');

	if (!bldId && !date) {
		return new NextResponse(JSON.stringify({ message: 'bldId 또는 date가 필요합니다.' }), { status: 400 });
	}

	let query = supabase
		.from('Ledger')
		.select('*, Buildings(address)')
		.order('date', { ascending: true })
		.order('id', { ascending: true });

	if (bldId) query = query.eq('bldId', bldId);
	if (date) query = query.eq('date', date);

	const { data, error } = await query;

	if (error) {
		console.error('장부 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '장부 조회에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ ledger: data }), { status: 200 });
}

// 장부 항목 등록/수정
export async function POST(request) {
	const { entry } = await request.json();

	if (!entry || !entry.bldId) {
		return new NextResponse(JSON.stringify({ message: '건물 정보가 없습니다.' }), { status: 400 });
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
		notes: entry.notes || null,
	};
	if (entry.id) payload.id = entry.id;

	const { error } = await supabase.from('Ledger').upsert(payload, { onConflict: ['id'] });

	if (error) {
		console.error('장부 저장 실패:', error);
		return new NextResponse(JSON.stringify({ message: '장부 저장에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '저장되었습니다.' }), { status: 200 });
}

export async function DELETE(request) {
	const { id } = await request.json();

	if (!id) {
		return new NextResponse(JSON.stringify({ message: '삭제할 항목 ID가 없습니다.' }), { status: 400 });
	}

	const { error } = await supabase.from('Ledger').delete().eq('id', id);

	if (error) {
		console.error('장부 삭제 실패:', error);
		return new NextResponse(JSON.stringify({ message: '삭제에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '삭제되었습니다.' }), { status: 200 });
}
