import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	const { schedule } = await request.json();

	if (!schedule) {
		return new NextResponse(JSON.stringify({ message: '일정 정보가 없습니다.' }), { status: 400 });
	}

	try {
		const { id, start, end, description, notes, rept, allday, bldId } = schedule;

		// 기존 일정을 수정하는 경우, 우리 가족 소유가 맞는지 먼저 확인
		if (id) {
			const { data: existing, error: existingError } = await supabaseAdmin
				.from('Schedule')
				.select('ownerId')
				.eq('id', id)
				.maybeSingle();

			if (existingError) throw existingError;
			if (!existing || existing.ownerId !== ownerId) {
				return new NextResponse(JSON.stringify({ message: '권한이 없습니다.' }), { status: 403 });
			}
		}

		const payload = { start, end, description, notes, rept, allday, bldId: bldId ?? null, ownerId };
		if (id) payload.id = id;

		const { error } = await supabaseAdmin.from('Schedule').upsert(payload, { onConflict: ['id'] });

		if (error) throw error;

		return new NextResponse(JSON.stringify({ message: '일정등록에 성공했습니다.' }), {
			status: 200,
		});
	} catch (error) {
		console.error('Error saving schedule:', error);
		return new NextResponse(JSON.stringify({ message: '일정등록에 실패했습니다.' }), {
			status: 500,
		});
	}
}

export async function DELETE(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = await resolveOwnerId(user);

	try {
		const { id } = await request.json();

		if (!id) {
			return new NextResponse(JSON.stringify({ message: '삭제할 일정 ID가 없습니다.' }), { status: 400 });
		}

		const { error, count } = await supabaseAdmin.from('Schedule').delete({ count: 'exact' }).eq('id', id).eq('ownerId', ownerId);

		if (error) throw error;

		if (count > 0) {
			return new NextResponse(JSON.stringify({ message: '일정이 삭제되었습니다.' }), { status: 200 });
		} else {
			return new NextResponse(JSON.stringify({ message: '일정을 찾을 수 없습니다.' }), { status: 404 });
		}
	} catch (error) {
		console.error('Error deleting schedule:', error);
		return new NextResponse(JSON.stringify({ message: '일정 삭제에 실패했습니다.' }), { status: 500 });
	}
}
