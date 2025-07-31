import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(request) {

	const { schedule } = await request.json();

	let scheduleResult = null;
	try {
		// SQL 쿼리 실행 - 데이터 저장
		if (schedule) {
			try {
				[scheduleResult] = await pool.query(
					`INSERT INTO schedule
					(id, start, end, description, notes, rept, allday)
					VALUES (?, ?, ?, ?, ?, ?, ?)
					ON DUPLICATE KEY UPDATE
					start = VALUES(start),
					end = VALUES(end),
					description = VALUES(description),
					notes = VALUES(notes),
					rept = VALUES(rept),
					allday = VALUES(allday)`,
				 [
						schedule.id || null,  // id가 없으면 null 삽입
						schedule.start,
						schedule.end,
						schedule.description,
						schedule.notes,
						schedule.rept,
						schedule.allday
				 ]
				);
				console.log('Building inserted successfully:', scheduleResult);
			} catch (error) {
				console.error('Error inserting building:', error);
			}
		}

		// 성공 메시지 응답
		return new NextResponse(JSON.stringify({message: '일정등록에 성공했습니다.'}), {
			status: 200,
		});
	} catch (error) {
		console.error('Error saving user:', error);
		return new NextResponse(JSON.stringify({message: '일정등록에 실패했습니다.'}), {
			status: 500,
		});
	}
}

export async function DELETE(request) {
	try {

		const { id } = await request.json();

		const [result] = await pool.query('DELETE FROM schedule WHERE id = ?', [id]);

		if (result.affectedRows > 0) {
			return new NextResponse(JSON.stringify({ message: '일정이 삭제되었습니다.' }), { status: 200 });
		} else {
			return new NextResponse(JSON.stringify({ message: '일정을 찾을 수 없습니다.' }), { status: 404 });
		}
	} catch (error) {
		console.error('Error deleting schedule:', error);
		return new NextResponse(JSON.stringify({ message: '일정 삭제에 실패했습니다.' }), { status: 500 });
	}
}