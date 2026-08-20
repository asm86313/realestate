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
		.select('*, Buildings!inner(address, ownerId)')
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

	return new NextResponse(JSON.stringify({ ledger: data }), { status: 200 });
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

	const { error } = await supabaseAdmin.from('Ledger').upsert(payload, { onConflict: ['id'] });

	if (error) {
		console.error('장부 저장 실패:', error);
		return new NextResponse(JSON.stringify({ message: '장부 저장에 실패했습니다.' }), { status: 500 });
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
