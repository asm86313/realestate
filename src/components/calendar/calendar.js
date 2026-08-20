'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Save, Trash2 } from 'lucide-react';

import { regSchedule, deleteSchedule } from '@/utils/core';
import { useScheduleQuery, useBldInfoQuery } from "@/hooks/queries";

/* shadcn 플러그인 */
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Select, SelectGroup, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

/* dayjs 플러그인 */
import dayjs from 'dayjs';

/* 캘린더 플러그인 */
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from '@fullcalendar/react';
import koLocale from '@fullcalendar/core/locales/ko';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function Calendar() {
	const calendarRef = useRef(null);
	const [calendarTitle, setCalendarTitle] = useState('');
	const queryClient = useQueryClient();
	const { data: scheduleList = [] } = useScheduleQuery();
	const { data: bldInfo } = useBldInfoQuery();
	const bldList = bldInfo?.Buildings ?? [];
	const getScheduleList = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['schedule'] });
	}, [queryClient]);

	const [isOpen, setIsOpen] = useState(false);
	const [event, setEvent] = useState([]);
	const [myBldList, setMyBldList] = useState([]);
	const [selectedBldId, setSelectedBldId] = useState('');
	const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
	const [id, setId] = useState(null);
	const [eventBldId, setEventBldId] = useState(null);
	const [description, setDescription] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [notes, setNotes] = useState('');
	const [repeat, setRepeat] = useState(0);
	const [isMounted, setMounted] = useState(true);

	useEffect(()=> {
		setEvent(scheduleList)
	}, [scheduleList])

	useEffect(()=> {
		setMyBldList(bldList)
	}, [bldList])

	const onDateClick = useCallback((info) => {
		setSelectedDate(info.dateStr);
	}, []);

	const onPrevMonth = useCallback(() => {
		calendarRef.current?.getApi().prev();
	}, []);

	const onNextMonth = useCallback(() => {
		calendarRef.current?.getApi().next();
	}, []);

	const onAddEvent = useCallback(()=>{
		setId(null)
		setEventBldId(selectedBldId || null)
		setDescription('');
		setNotes('')
		setRepeat(0)
		setStartDate(dayjs(selectedDate).format('YYYY-MM-DDT00:mm'));
		setEndDate(dayjs(selectedDate).format('YYYY-MM-DDT12:mm'));
		setIsOpen(true)
	}, [selectedBldId, selectedDate]);

	const openEditSheet = useCallback((schedule) => {
		setId(schedule.id)
		setEventBldId(schedule.bldId ?? null)
		setStartDate(dayjs(schedule.start).format('YYYY-MM-DDTHH:mm'));
		setEndDate(dayjs(schedule.end).format('YYYY-MM-DDTHH:mm'));
		setDescription(schedule.description);
		setNotes(schedule.notes)
		setRepeat(schedule.rept)
		setIsOpen(true)
	}, []);

	const onEditEvent = useCallback((info)=>{
		openEditSheet({
			id: info.event.id,
			description: info.event.title,
			start: info.event.start,
			end: info.event.end,
			notes: info.event.extendedProps.notes,
			rept: info.event.extendedProps.rept,
			bldId: info.event.extendedProps.bldId,
		});
	}, [openEditSheet]);

	const onSave = useCallback(async ()=>{
		if(repeat > 0 && id === null) {
			for (let i = 0; i <= repeat; i++) {
				const newStartDate = dayjs(startDate).add(i, 'month').format('YYYY-MM-DDTHH:mm');
				const newEndDate = dayjs(endDate).add(i, 'month').format('YYYY-MM-DDTHH:mm');

				const newSchedule = {
				  id: id,
				  description: description,
				  start: newStartDate,
				  end: newEndDate,
				  notes: notes,
				  allday: true,
				  rept: 0,
				  bldId: eventBldId,
				};
				// 스케줄을 비동기적으로 저장
				await regSchedule(newSchedule);
			  }
		} else {
			regSchedule({
				id: id,
				description: description,
				start: startDate,
				end: endDate,
				notes: notes,
				allday: true,
				rept: 0,
				bldId: eventBldId,
			})
		}

		setTimeout(() => {
			getScheduleList();
		}, 100);
		setIsOpen(false);
		toast.success(id ? '일정이 수정되었습니다.' : '일정이 등록되었습니다.');
	}, [id, eventBldId, description, startDate, endDate, notes, repeat, getScheduleList]);

	const onCancel = useCallback(()=>{
		setIsOpen(false)
	}, []);

	const onDelete = useCallback(()=>{
		deleteSchedule(id).then(() => {
			toast.success('일정이 삭제되었습니다.');
			setIsOpen(false);
			getScheduleList();
		});
	}, [id, getScheduleList]);

	useEffect(() => {
		const today = dayjs();
		if (event.length > 0 && isMounted) {
			setMounted(false);
			event.map(schedule => {
				if (dayjs(schedule.start).isSame(today, 'day')) {
					toast.info(`${schedule.description}`, {
						description: `${schedule.notes}`,
					});
				}
			})
		}
	  }, [event]);

	const onEventDrop = useCallback((e)=>{
		const { id, start, end, title:description, extendedProps } = e.event;
		const startDate = dayjs(start).format('YYYY-MM-DDTHH:mm');
		const endDate = dayjs(end).format('YYYY-MM-DDTHH:mm');
		regSchedule({
			id: id,
			description: description,
			start: startDate,
			end: endDate,
			notes: extendedProps.notes,
			allday: true,
			rept: 0,
			bldId: extendedProps.bldId ?? null,
		});
	}, [])

	// 선택한 건물이 있으면 그 건물 일정만 필터링해서 보여준다.
	const filteredEvent = selectedBldId
		? event.filter((schedule) => String(schedule.bldId) === selectedBldId)
		: event;

	// 선택한 날짜의 일정만 아래 목록에 보여준다.
	const dayEvents = filteredEvent
		.filter((schedule) => dayjs(schedule.start).format('YYYY-MM-DD') === selectedDate)
		.sort((a, b) => dayjs(a.start).diff(dayjs(b.start)));

	const selectedDateLabel = `${dayjs(selectedDate).format('M월 D일')} (${WEEKDAYS[dayjs(selectedDate).day()]})`;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-2 py-4 sm:px-4">
			<div>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">일정</h1>
				<p className="text-sm text-muted-foreground">건물별 일정을 확인하고 관리하세요.</p>
			</div>

			<div className="flex flex-col gap-2">
				<Select value={selectedBldId || 'all'} onValueChange={(v) => setSelectedBldId(v === 'all' ? '' : v)}>
					<SelectTrigger>
						<SelectValue placeholder="건물 구분" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
						<SelectItem value="all">전체 건물</SelectItem>
						{myBldList.map(list => (
							<SelectItem value={String(list.id)} key={list.address + list.id}>{list.address}</SelectItem>
						))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<Button type="button" className="gap-1.5" onClick={onAddEvent}>
					<Plus className="size-4" /> 일정 추가
				</Button>
			</div>

			<Card className="border-none shadow-sm">
				<CardContent className="flex items-center justify-between p-3 sm:p-3">
					<Button type="button" variant="ghost" size="icon" onClick={onPrevMonth}>
						<ChevronLeft className="size-4" />
					</Button>
					<span className="text-base font-semibold">{calendarTitle}</span>
					<Button type="button" variant="ghost" size="icon" onClick={onNextMonth}>
						<ChevronRight className="size-4" />
					</Button>
				</CardContent>
			</Card>

			<div className="overflow-hidden rounded-xl bg-card p-2 shadow-sm sm:p-4">
				<FullCalendar
					ref={calendarRef}
					plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
					initialView={'dayGridMonth'}
					headerToolbar={false}
					datesSet={(arg) => setCalendarTitle(arg.view.title)}
					locale={koLocale}
					editable={true}
					eventDurationEditable={true}
					height="auto"
					droppable={true}
					dayMaxEvents={0}
					displayEventTime={false}
					dayCellContent={(arg) => arg.date.getDate()}
					dayCellClassNames={(arg) => {
						const dateStr = dayjs(arg.date).format('YYYY-MM-DD');
						// 오늘은 항상 테두리 원(.fc-day-today)만 쓰고, 오늘이 아닌 날짜를 선택했을 때만 채운 원을 쓴다.
						return dateStr === selectedDate && dateStr !== dayjs().format('YYYY-MM-DD') ? ['is-selected'] : [];
					}}
					moreLinkContent={(arg) => `+${arg.num}`}
					moreLinkClick={(arg) => {
						setSelectedDate(dayjs(arg.date).format('YYYY-MM-DD'));
						return 'none';
					}}
					dateClick={onDateClick}
					eventClick={onEditEvent}
					events={filteredEvent}
					eventDrop={onEventDrop}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<CalendarClock className="size-4 text-muted-foreground" />
					<h2 className="text-sm font-semibold">{selectedDateLabel} 일정</h2>
				</div>
				{dayEvents.length === 0 ? (
					<Card>
						<CardContent className="flex items-center justify-center p-8 sm:p-8 text-sm text-muted-foreground">
							등록된 일정이 없습니다.
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardContent className="divide-y p-0 sm:p-0">
							{dayEvents.map((s) => (
								<div
									key={s.id}
									className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-accent active:bg-accent"
									onClick={() => openEditSheet(s)}
								>
									<div className="flex shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 px-2.5 py-1.5 text-primary">
										<span className="text-xs font-semibold">{dayjs(s.start).format('HH:mm')}</span>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{s.description}</p>
										{s.notes && <p className="truncate text-xs text-muted-foreground">{s.notes}</p>}
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				)}
			</div>

			<Sheet open={isOpen} onOpenChange={setIsOpen}>
				<SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
					<SheetHeader>
						<SheetTitle>{id ? '일정 수정' : '일정 등록'}</SheetTitle>
					</SheetHeader>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label>건물</Label>
							<Select value={eventBldId ? String(eventBldId) : 'none'} onValueChange={(v) => setEventBldId(v === 'none' ? null : v)}>
								<SelectTrigger>
									<SelectValue placeholder="건물 선택" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
									<SelectItem value="none">미지정</SelectItem>
									{myBldList.map(list => (
										<SelectItem value={String(list.id)} key={list.address + list.id}>{list.address}</SelectItem>
									))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>내용</Label>
							<Input value={description} placeholder="내용을 입력하세요" onChange={(e) => setDescription(e.target.value)} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>시작일</Label>
							<Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>종료일</Label>
							<Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>반복(개월)</Label>
							<Input type="number" value={repeat} placeholder="반복(개월)" onChange={(e) => setRepeat(e.target.value)} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>비고</Label>
							<Textarea className="h-[100px]" value={notes} placeholder="비고" onChange={(e) => setNotes(e.target.value)} />
						</div>
					</div>
					<SheetFooter className="flex-col gap-2 space-x-0 sm:space-x-0">
						<Button type="button" className="w-full gap-1.5" onClick={onSave}>
							<Save className="size-4" /> {id ? '수정' : '저장'}
						</Button>
						{id && (
							<Button type="button" variant="destructive" className="w-full gap-1.5" onClick={onDelete}>
								<Trash2 className="size-4" /> 삭제
							</Button>
						)}
						<Button type="button" variant="secondary" className="w-full" onClick={onCancel}>취소</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</div>
	);
}
