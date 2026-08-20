import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import webpush from '@/lib/webpush';
import { getHolidayDatesForMonth } from '@/lib/holidays';

// "휴무일이면 다음 평일에" 옵션을 반영해 실제 생성일을 정한다.
// 토/일/공휴일이면 하루씩 미뤄서 평일을 찾고, 이번 달을 넘어가면(드문 경우) 원래 날짜로 되돌린다.
function resolveGenerationDay(year, month, day, daysInMonth, skipHoliday, holidaySet) {
	if (!skipHoliday) return day;

	for (let d = day; d <= daysInMonth; d += 1) {
		const weekday = new Date(year, month - 1, d).getDay(); // 0=일 6=토
		const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
		if (weekday !== 0 && weekday !== 6 && !holidaySet.has(key)) {
			return d;
		}
	}
	return day;
}

// 오늘 날짜 기준 정보 + (필요하다면 한 번만 가져온) 이번 달 공휴일 집합을 계산한다.
async function getTodayContext() {
	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth() + 1; // 1~12
	const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`;
	const daysInMonth = new Date(year, month, 0).getDate();
	const todayDay = today.getDate();
	return { year, month, currentMonthKey, daysInMonth, todayDay };
}

// 반복 일정 템플릿 중, 오늘이 지정한 날짜(dayOfMonth, 필요시 휴무일 보정)이고
// 이번 달에 아직 안 만든 것들을 실제 Schedule 항목으로 생성한다.
async function generateRecurringSchedules(ctx, getHolidaySet) {
	const { data: templates, error } = await supabaseAdmin
		.from('ScheduleTemplates')
		.select('*')
		.eq('active', true);

	if (error || !templates || templates.length === 0) return;

	const { year, month, currentMonthKey, daysInMonth, todayDay } = ctx;
	const needsHolidayCheck = templates.some((tpl) => tpl.skipHoliday && tpl.lastGeneratedMonth !== currentMonthKey);
	const holidaySet = needsHolidayCheck ? await getHolidaySet() : new Set();

	for (const tpl of templates) {
		if (tpl.lastGeneratedMonth === currentMonthKey) continue;

		const baseDay = Math.min(tpl.dayOfMonth, daysInMonth);
		const effectiveDay = resolveGenerationDay(year, month, baseDay, daysInMonth, tpl.skipHoliday, holidaySet);
		if (todayDay !== effectiveDay) continue;

		const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(effectiveDay).padStart(2, '0')}`;

		const { error: insertError } = await supabaseAdmin.from('Schedule').insert({
			ownerId: tpl.ownerId,
			start: `${dateStr}T09:00:00`,
			end: `${dateStr}T18:00:00`,
			description: tpl.description,
			notes: tpl.notes,
			rept: 0,
			allday: true,
			bldId: tpl.bldId,
		});

		if (insertError) {
			console.error('반복 일정 생성 실패:', tpl.id, insertError);
			continue;
		}

		await supabaseAdmin
			.from('ScheduleTemplates')
			.update({ lastGeneratedMonth: currentMonthKey })
			.eq('id', tpl.id);
	}
}

// 반복 장부 템플릿 중, 오늘이 지정한 날짜(필요시 휴무일 보정)이고
// 이번 달에 아직 안 만든 것들을 실제 Ledger 항목으로 생성한다.
async function generateRecurringLedgerEntries(ctx, getHolidaySet) {
	const { data: templates, error } = await supabaseAdmin
		.from('LedgerTemplates')
		.select('*')
		.eq('active', true);

	if (error || !templates || templates.length === 0) return;

	const { year, month, currentMonthKey, daysInMonth, todayDay } = ctx;
	const needsHolidayCheck = templates.some((tpl) => tpl.skipHoliday && tpl.lastGeneratedMonth !== currentMonthKey);
	const holidaySet = needsHolidayCheck ? await getHolidaySet() : new Set();

	for (const tpl of templates) {
		if (tpl.lastGeneratedMonth === currentMonthKey) continue;

		const baseDay = Math.min(tpl.dayOfMonth, daysInMonth);
		const effectiveDay = resolveGenerationDay(year, month, baseDay, daysInMonth, tpl.skipHoliday, holidaySet);
		if (todayDay !== effectiveDay) continue;

		const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(effectiveDay).padStart(2, '0')}`;

		const { error: insertError } = await supabaseAdmin.from('Ledger').insert({
			bldId: tpl.bldId,
			date: dateStr,
			purpose: tpl.purpose,
			income: tpl.income,
			expense: tpl.expense,
			interestRate: tpl.interestRate,
			interestAmount: tpl.interestAmount,
			borrowedDays: tpl.borrowedDays,
			notes: tpl.notes,
		});

		if (insertError) {
			console.error('반복 장부 항목 생성 실패:', tpl.id, insertError);
			continue;
		}

		await supabaseAdmin
			.from('LedgerTemplates')
			.update({ lastGeneratedMonth: currentMonthKey })
			.eq('id', tpl.id);
	}
}

// 매일 정해진 시간에 크론(Vercel Cron 등)이 호출해서
// 반복 일정 템플릿을 오늘자 일정으로 생성하고, 오늘 날짜인 일정을 찾아 등록된 모든 기기로 푸시를 보낸다.
export async function GET(request) {
	const authHeader = request.headers.get('authorization');
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
	}

	const ctx = await getTodayContext();
	// 두 생성기가 둘 다 휴무일 보정이 필요한 경우에도 공휴일 API는 한 번만 호출한다.
	let cachedHolidaySet = null;
	const getHolidaySet = async () => {
		if (!cachedHolidaySet) {
			cachedHolidaySet = await getHolidayDatesForMonth(ctx.year, ctx.month);
		}
		return cachedHolidaySet;
	};

	await generateRecurringSchedules(ctx, getHolidaySet);
	await generateRecurringLedgerEntries(ctx, getHolidaySet);

	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date();
	todayEnd.setHours(23, 59, 59, 999);

	const { data: schedules, error: scheduleError } = await supabaseAdmin
		.from('Schedule')
		.select('*')
		.gte('start', todayStart.toISOString())
		.lte('start', todayEnd.toISOString());

	if (scheduleError) {
		console.error('일정 조회 실패:', scheduleError);
		return new NextResponse(JSON.stringify({ message: '일정 조회에 실패했습니다.' }), { status: 500 });
	}

	if (!schedules || schedules.length === 0) {
		return new NextResponse(JSON.stringify({ message: '오늘 알림 보낼 일정이 없습니다.', sent: 0 }), { status: 200 });
	}

	const { data: subscriptions, error: subError } = await supabaseAdmin.from('PushSubscriptions').select('*');

	if (subError) {
		console.error('구독 조회 실패:', subError);
		return new NextResponse(JSON.stringify({ message: '구독 조회에 실패했습니다.' }), { status: 500 });
	}

	if (!subscriptions || subscriptions.length === 0) {
		return new NextResponse(JSON.stringify({ message: '등록된 알림 구독이 없습니다.', sent: 0 }), { status: 200 });
	}

	// 가족(ownerId)별로 구독을 묶어서, 그 가족의 일정만 그 가족 구독자에게 보낸다.
	const subsByOwner = new Map();
	for (const sub of subscriptions) {
		if (!subsByOwner.has(sub.ownerId)) subsByOwner.set(sub.ownerId, []);
		subsByOwner.get(sub.ownerId).push(sub);
	}

	let sent = 0;
	const staleEndpoints = [];

	for (const schedule of schedules) {
		const ownerSubs = subsByOwner.get(schedule.ownerId);
		if (!ownerSubs || ownerSubs.length === 0) continue;

		const payload = JSON.stringify({
			title: '오늘 일정 알림',
			body: schedule.description || '오늘 예정된 일정이 있습니다.',
			url: '/calendar',
		});

		for (const sub of ownerSubs) {
			const pushSubscription = {
				endpoint: sub.endpoint,
				keys: { p256dh: sub.p256dh, auth: sub.auth },
			};

			try {
				await webpush.sendNotification(pushSubscription, payload);
				sent += 1;
			} catch (err) {
				// 만료/구독취소된 기기는 목록에서 제거
				if (err.statusCode === 404 || err.statusCode === 410) {
					staleEndpoints.push(sub.endpoint);
				} else {
					console.error('푸시 발송 실패:', err.statusCode, err.body);
				}
			}
		}
	}

	if (staleEndpoints.length > 0) {
		await supabaseAdmin.from('PushSubscriptions').delete().in('endpoint', staleEndpoints);
	}

	return new NextResponse(
		JSON.stringify({ message: '발송 완료', scheduleCount: schedules.length, subscriptionCount: subscriptions.length, sent }),
		{ status: 200 }
	);
}
