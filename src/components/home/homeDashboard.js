'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import dayjs from 'dayjs';

import { useScheduleQuery, useBldInfoQuery, useLedgerByDateQuery } from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectGroup, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const numberFmt = new Intl.NumberFormat('ko-KR');
const toWon = (n) => numberFmt.format(Number(n || 0));

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function HomeDashboard() {
	const router = useRouter();
	const [selectedDate, setSelectedDate] = useState(() => dayjs());
	const selectedDateStr = selectedDate.format('YYYY-MM-DD');
	const isToday = selectedDateStr === dayjs().format('YYYY-MM-DD');
	const selectedDateLabel = `${selectedDate.format('M월 D일')} (${WEEKDAYS[selectedDate.day()]})`;

	const { data: scheduleList = [] } = useScheduleQuery();
	const { data: bldInfo } = useBldInfoQuery();
	const { data: todayLedger = [] } = useLedgerByDateQuery(selectedDateStr);
	const bldList = bldInfo?.Buildings ?? [];

	const [selectedBldId, setSelectedBldId] = useState('');

	const onPrevDay = () => setSelectedDate((d) => d.subtract(1, 'day'));
	const onNextDay = () => setSelectedDate((d) => d.add(1, 'day'));

	const bldAddressById = useMemo(() => {
		const map = new Map();
		bldList.forEach((b) => map.set(String(b.id), b.address));
		return map;
	}, [bldList]);

	const todaySchedule = useMemo(() => {
		return scheduleList
			.filter((s) => dayjs(s.start).format('YYYY-MM-DD') === selectedDateStr)
			.filter((s) => !selectedBldId || String(s.bldId) === selectedBldId)
			.sort((a, b) => dayjs(a.start).diff(dayjs(b.start)));
	}, [scheduleList, selectedDateStr, selectedBldId]);

	const filteredLedger = useMemo(() => {
		return todayLedger.filter((row) => !selectedBldId || String(row.bldId) === selectedBldId);
	}, [todayLedger, selectedBldId]);

	const todayIncome = filteredLedger.reduce((sum, row) => sum + Number(row.income || 0), 0);
	const todayExpense = filteredLedger.reduce((sum, row) => sum + Number(row.expense || 0), 0);

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-2 py-4 sm:px-4">
			<div>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">대시보드</h1>
				<p className="text-sm text-muted-foreground">선택한 날짜의 일정과 회계 내역이에요.</p>
			</div>

			<Select value={selectedBldId || 'all'} onValueChange={(v) => setSelectedBldId(v === 'all' ? '' : v)}>
				<SelectTrigger>
					<SelectValue placeholder="건물 구분" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectItem value="all">전체 건물</SelectItem>
						{bldList.map((b) => (
							<SelectItem value={String(b.id)} key={b.address + b.id}>{b.address}</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>

			<Card className="border-none shadow-sm">
				<CardContent className="flex items-center justify-between p-3 sm:p-3">
					<Button type="button" variant="ghost" size="icon" onClick={onPrevDay}>
						<ChevronLeft className="size-4" />
					</Button>
					<button
						type="button"
						className="flex flex-col items-center gap-0.5"
						onClick={() => setSelectedDate(dayjs())}
					>
						<span className="text-base font-semibold">{selectedDateLabel}</span>
						{!isToday && <span className="text-xs text-primary">오늘로 이동</span>}
					</button>
					<Button type="button" variant="ghost" size="icon" onClick={onNextDay}>
						<ChevronRight className="size-4" />
					</Button>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<CalendarClock className="size-4 text-muted-foreground" />
					<h2 className="text-sm font-semibold">{isToday ? '금일 일정' : `${selectedDateLabel} 일정`}</h2>
				</div>
				{todaySchedule.length === 0 ? (
					<Card>
						<CardContent className="flex items-center justify-center p-8 sm:p-8 text-sm text-muted-foreground">
							등록된 일정이 없습니다.
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardContent className="divide-y p-0 sm:p-0">
							{todaySchedule.map((s) => (
								<div
									key={s.id}
									className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-accent active:bg-accent"
									onClick={() => router.push('/calendar')}
								>
									<div className="flex shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 px-2.5 py-1.5 text-primary">
										<span className="text-xs font-semibold">{dayjs(s.start).format('HH:mm')}</span>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{s.description}</p>
										<div className="flex flex-wrap items-center gap-1.5">
											{s.bldId && (
												<p className="truncate text-xs text-muted-foreground">{bldAddressById.get(String(s.bldId))}</p>
											)}
											{s.notes && <p className="truncate text-xs text-muted-foreground">{s.notes}</p>}
										</div>
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<Wallet className="size-4 text-muted-foreground" />
					<h2 className="text-sm font-semibold">{isToday ? '금일 회계내역' : `${selectedDateLabel} 회계내역`}</h2>
				</div>
				{filteredLedger.length > 0 && (
					<div className="flex justify-center gap-4 text-sm">
						<span className="text-primary">입금 {toWon(todayIncome)}원</span>
						<span className="text-destructive">출금 {toWon(todayExpense)}원</span>
					</div>
				)}
				{filteredLedger.length === 0 ? (
					<Card>
						<CardContent className="flex items-center justify-center p-8 sm:p-8 text-sm text-muted-foreground">
							등록된 회계 내역이 없습니다.
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardContent className="divide-y p-0 sm:p-0">
							{filteredLedger.map((row) => (
								<div key={row.id} className="flex items-center justify-between gap-3 p-4">
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{row.purpose || '(내용 없음)'}</p>
										<p className="truncate text-xs text-muted-foreground">{row.Buildings?.address}</p>
										{row.notes && <p className="truncate text-xs text-muted-foreground">{row.notes}</p>}
									</div>
									<div className="shrink-0 text-right text-sm font-semibold">
										{row.income ? <p className="text-primary">+{toWon(row.income)}</p> : null}
										{row.expense ? <p className="text-destructive">-{toWon(row.expense)}</p> : null}
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
