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

// "YYYY-MM" 두 개의 개월수 차이(a - b). 문자열 비교/파싱만으로 계산한다.
function monthKeyDiff(a, b) {
	const [ay, am] = a.split('-').map(Number);
	const [by, bm] = b.split('-').map(Number);
	return (ay - by) * 12 + (am - bm);
}

// 이 템플릿이 이번 달(currentMonthKey)에 생성 대상인지: 시작월/끝월 범위 안이고,
// N개월마다 반복이면 시작월을 기준으로 몇 개월째인지 세서 그 배수인 달에만 해당한다.
function isTemplateEligibleThisMonth(tpl, currentMonthKey, createdMonthKey) {
	if (tpl.startMonth && currentMonthKey < tpl.startMonth) return false;
	if (tpl.endMonth && currentMonthKey > tpl.endMonth) return false;

	const interval = Number(tpl.intervalMonths) || 1;
	if (interval <= 1) return true;

	const anchor = tpl.startMonth || createdMonthKey;
	const diff = monthKeyDiff(currentMonthKey, anchor);
	return diff >= 0 && diff % interval === 0;
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

		const createdMonthKey = (tpl.createdAt || '').slice(0, 7) || currentMonthKey;
		if (!isTemplateEligibleThisMonth(tpl, currentMonthKey, createdMonthKey)) continue;

		const baseDay = Math.min(tpl.dayOfMonth, daysInMonth);
		const effectiveDay = resolveGenerationDay(year, month, baseDay, daysInMonth, tpl.skipHoliday, holidaySet);
		if (todayDay !== effectiveDay) continue;

		const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(effectiveDay).padStart(2, '0')}`;

		const { data: insertedRows, error: insertError } = await supabaseAdmin
			.from('Ledger')
			.insert({
				bldId: tpl.bldId,
				date: dateStr,
				purpose: tpl.purpose,
				income: tpl.income,
				expense: tpl.expense,
				interestRate: tpl.interestRate,
				interestAmount: tpl.interestAmount,
				borrowedDays: tpl.borrowedDays,
				interestAuto: tpl.interestAuto,
				notes: tpl.notes,
				reportId: tpl.reportId,
				bankAccountId: tpl.bankAccountId,
			})
			.select('id');

		if (insertError) {
			console.error('반복 장부 항목 생성 실패:', tpl.id, insertError);
			continue;
		}

		// 카테고리는 이제 연결 테이블(LedgerReportLinks)로 관리한다. 템플릿은 카테고리 하나만
		// 고르지만, 생성된 내역이 화면(reportIds 기반)에서 바로 카테고리에 잡히도록 여기도 이어준다.
		const newLedgerId = insertedRows?.[0]?.id;
		if (tpl.reportId && newLedgerId) {
			const { error: linkError } = await supabaseAdmin
				.from('LedgerReportLinks')
				.insert({ ledgerId: newLedgerId, reportId: tpl.reportId });
			if (linkError) {
				console.error('반복 장부 카테고리 연결 실패:', tpl.id, linkError);
			}
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
	// 크론 전용 엔드포인트라 외부에서 호출되면 안 된다.
	// CRON_SECRET이 설정되지 않은 환경에서도 열리지 않도록 막는다(fail closed).
	// Vercel Cron은 프로젝트에 CRON_SECRET이 있으면 이 헤더를 자동으로 붙여준다.
	const cronSecret = process.env.CRON_SECRET;
	const authHeader = request.headers.get('authorization');
	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
	const todayDateStr = `${ctx.year}-${String(ctx.month).padStart(2, '0')}-${String(ctx.todayDay).padStart(2, '0')}`;

	const { data: schedules, error: scheduleError } = await supabaseAdmin
		.from('Schedule')
		.select('*')
		.gte('start', todayStart.toISOString())
		.lte('start', todayEnd.toISOString());

	if (scheduleError) {
		console.error('일정 조회 실패:', scheduleError);
		return new NextResponse(JSON.stringify({ message: '일정 조회에 실패했습니다.' }), { status: 500 });
	}

	// Ledger엔 ownerId가 없어서, 건물(Buildings)을 거쳐 어느 가족 것인지 알아낸다.
	const { data: ledgerEntries, error: ledgerError } = await supabaseAdmin
		.from('Ledger')
		.select('*, Buildings!inner(ownerId, address)')
		.eq('date', todayDateStr);

	if (ledgerError) {
		console.error('장부 조회 실패:', ledgerError);
		return new NextResponse(JSON.stringify({ message: '장부 조회에 실패했습니다.' }), { status: 500 });
	}

	if ((!schedules || schedules.length === 0) && (!ledgerEntries || ledgerEntries.length === 0)) {
		return new NextResponse(JSON.stringify({ message: '오늘 알림 보낼 게 없습니다.', sent: 0 }), { status: 200 });
	}

	const { data: subscriptions, error: subError } = await supabaseAdmin.from('PushSubscriptions').select('*');

	if (subError) {
		console.error('구독 조회 실패:', subError);
		return new NextResponse(JSON.stringify({ message: '구독 조회에 실패했습니다.' }), { status: 500 });
	}

	if (!subscriptions || subscriptions.length === 0) {
		return new NextResponse(JSON.stringify({ message: '등록된 알림 구독이 없습니다.', sent: 0 }), { status: 200 });
	}

	// 가족(ownerId)별로 구독을 묶어서, 그 가족의 알림만 그 가족 구독자에게 보낸다.
	const subsByOwner = new Map();
	for (const sub of subscriptions) {
		if (!subsByOwner.has(sub.ownerId)) subsByOwner.set(sub.ownerId, []);
		subsByOwner.get(sub.ownerId).push(sub);
	}

	let sent = 0;
	const staleEndpoints = [];
	const numberFmt = new Intl.NumberFormat('ko-KR');

	// 같은 가족 구독자들에게 알림 하나를 전부 발송한다.
	const sendToOwner = async (ownerId, payload) => {
		const ownerSubs = subsByOwner.get(ownerId);
		if (!ownerSubs || ownerSubs.length === 0) return;

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
	};

	for (const schedule of schedules || []) {
		await sendToOwner(
			schedule.ownerId,
			JSON.stringify({
				title: '오늘 일정 알림',
				body: schedule.description || '오늘 예정된 일정이 있습니다.',
				url: '/calendar',
			})
		);
	}

	for (const entry of ledgerEntries || []) {
		const amountText = entry.income
			? `입금 ${numberFmt.format(entry.income)}원`
			: entry.expense
				? `출금 ${numberFmt.format(entry.expense)}원`
				: '';
		await sendToOwner(
			entry.Buildings.ownerId,
			JSON.stringify({
				title: '오늘 장부 등록 알림',
				body: [entry.purpose, entry.Buildings.address, amountText].filter(Boolean).join(' · ') || '오늘 등록된 장부 내역이 있습니다.',
				url: '/ledger',
			})
		);
	}

	if (staleEndpoints.length > 0) {
		await supabaseAdmin.from('PushSubscriptions').delete().in('endpoint', staleEndpoints);
	}

	return new NextResponse(
		JSON.stringify({
			message: '발송 완료',
			scheduleCount: schedules?.length ?? 0,
			ledgerCount: ledgerEntries?.length ?? 0,
			subscriptionCount: subscriptions.length,
			sent,
		}),
		{ status: 200 }
	);
}
