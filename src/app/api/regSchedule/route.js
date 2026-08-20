import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
	const { schedule } = await request.json();

	if (!schedule) {
		return new NextResponse(JSON.stringify({ message: '일정 정보가 없습니다.' }), { status: 400 });
	}

	try {
		const { id, start, end, description, notes, rept, allday, bldId } = schedule;
		const payload = { start, end, description, notes, rept, allday, bldId: bldId ?? null };
		if (id) payload.id = id;

		const { error } = await supabase.from('Schedule').upsert(payload, { onConflict: ['id'] });

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
	try {
		const { id } = await request.json();

		if (!id) {
			return new NextResponse(JSON.stringify({ message: '삭제할 일정 ID가 없습니다.' }), { status: 400 });
		}

		const { error, count } = await supabase.from('Schedule').delete({ count: 'exact' }).eq('id', id);

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
