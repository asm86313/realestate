import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

// 통장(계좌)은 카테고리(요약표)와 같은 방식으로 건물(bldId) 단위로 관리한다.
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
		.from('BankAccounts')
		.select('*')
		.eq('bldId', bldId)
		.order('createdAt', { ascending: true });

	if (error) {
		console.error('통장 조회 실패:', error);
		return new NextResponse(JSON.stringify({ message: '조회에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ accounts: data }), { status: 200 });
}

// 등록/수정. 같은 건물에 이름이 같은 게 이미 있으면(신규 등록 시) 새로 안 만들고 그걸 재사용한다.
export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { account } = await request.json();
	const name = account?.name?.trim();

	if (!account?.bldId || !name) {
		return new NextResponse(JSON.stringify({ message: '건물과 통장 이름은 필수입니다.' }), { status: 400 });
	}

	// 이 건물이 우리 가족 소유가 맞는지 확인
	const { data: bld, error: bldError } = await supabaseAdmin
		.from('Buildings')
		.select('id')
		.eq('id', account.bldId)
		.eq('ownerId', ownerId)
		.maybeSingle();

	if (bldError) {
		console.error('건물 확인 실패:', bldError);
		return new NextResponse(JSON.stringify({ message: '건물 확인에 실패했습니다.' }), { status: 500 });
	}
	if (!bld) {
		return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
	}

	if (account.id) {
		// 기존 통장을 수정하는 경우, 같은 건물 것인지 확인
		const { data: existing, error: existingError } = await supabaseAdmin
			.from('BankAccounts')
			.select('id')
			.eq('id', account.id)
			.eq('bldId', account.bldId)
			.maybeSingle();

		if (existingError) {
			console.error('통장 확인 실패:', existingError);
			return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
		}
		if (!existing) {
			return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
		}

		const { error: updateError } = await supabaseAdmin.from('BankAccounts').update({ name }).eq('id', account.id);
		if (updateError) {
			console.error('통장 저장 실패:', updateError);
			if (updateError.code === '23505') {
				return new NextResponse(JSON.stringify({ message: '이미 같은 이름의 통장이 있어요.' }), { status: 409 });
			}
			return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
		}

		return new NextResponse(JSON.stringify({ message: '저장되었습니다.', id: account.id }), { status: 200 });
	}

	// 새로 만드는 경우, 같은 건물에 같은 이름이 이미 있으면 그걸 그대로 재사용한다.
	const { data: existingByName, error: findError } = await supabaseAdmin
		.from('BankAccounts')
		.select('id')
		.eq('bldId', account.bldId)
		.eq('name', name)
		.maybeSingle();

	if (findError) {
		console.error('통장 확인 실패:', findError);
		return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
	}

	if (existingByName) {
		return new NextResponse(JSON.stringify({ message: '저장되었습니다.', id: existingByName.id }), { status: 200 });
	}

	const { data: inserted, error: insertError } = await supabaseAdmin
		.from('BankAccounts')
		.insert({ bldId: account.bldId, name, ownerId })
		.select('id')
		.single();

	if (insertError) {
		console.error('통장 저장 실패:', insertError);
		return new NextResponse(JSON.stringify({ message: '저장에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '저장되었습니다.', id: inserted.id }), { status: 200 });
}

export async function DELETE(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { id } = await request.json();

	if (!id) {
		return new NextResponse(JSON.stringify({ message: '삭제할 통장 ID가 없습니다.' }), { status: 400 });
	}

	// 삭제 대상이 우리 가족 소유 건물의 통장인지 확인
	const { data: existing, error: existingError } = await supabaseAdmin
		.from('BankAccounts')
		.select('id, Buildings!inner(ownerId)')
		.eq('id', id)
		.eq('Buildings.ownerId', ownerId)
		.maybeSingle();

	if (existingError) {
		console.error('통장 확인 실패:', existingError);
		return new NextResponse(JSON.stringify({ message: '확인에 실패했습니다.' }), { status: 500 });
	}
	if (!existing) {
		return new NextResponse(JSON.stringify({ message: '권한이 없거나 존재하지 않는 통장입니다.' }), { status: 403 });
	}

	// 이 통장을 쓰던 내역들은 delete-set-null로 통장 정보만 없어지고 내역 자체는 남는다.
	const { error } = await supabaseAdmin.from('BankAccounts').delete().eq('id', id);

	if (error) {
		console.error('통장 삭제 실패:', error);
		return new NextResponse(JSON.stringify({ message: '삭제에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '삭제되었습니다.' }), { status: 200 });
}
