'use client';

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

/* redux */
import { setSchedule, deleteSchedule } from '@/utils/core';
import { scheduleState, buildingsState } from "@/app/slices/storeSlice";

/* shadcn 플러그인 */
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectGroup, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

import { depositStatus } from '@/utils/constants';

/* dayjs 플러그인 */
import dayjs from 'dayjs';

/* 캘린더 플러그인 */
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from '@fullcalendar/react';
import listPlugin from "@fullcalendar/list";
import koLocale from '@fullcalendar/core/locales/ko';

import css from "./calendar.module.css";

export default function Calendar({getScheduleList}) {
	const scheduleList = useSelector(scheduleState);
	const bldList = useSelector(buildingsState);

	const [isOpen, setIsOpen] = useState(false);
	const [event, setEvent] = useState([]);
	const [myBldList, setMyBldList] = useState([]);
	const [id, setId] = useState(null);
	const [description, setDescription] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [notes, setNotes] = useState('');
	const [repeat, setRepeat] = useState(0);
	const [isMounted, setMounted] = useState(true);
	const [isInterest, setInterest] = useState(false);
	

	const onAddEvent = useCallback((info)=>{
		setId(null)
		setDescription('');
		setNotes('')
		setRepeat(0)
		if (info) {
			setStartDate(dayjs(info.dateStr).format('YYYY-MM-DDT00:mm'));
			setEndDate(dayjs(info.dateStr).format('YYYY-MM-DDT12:mm'));
		} else {
			setStartDate(dayjs().format('YYYY-MM-DDT00:00'));
			setEndDate(dayjs().format('YYYY-MM-DDT12:00'));
		}
		setIsOpen(true)
	}, [event]);

	useEffect(()=> {
		setEvent(scheduleList)
	}, [scheduleList])

	useEffect(()=> {
console.log('isInterest', isInterest)
	}, [isInterest])

	useEffect(()=> {
		setMyBldList(bldList)
	}, [bldList])

	const onEditEvent = useCallback((info)=>{
		console.log(info.event)
		setId(info.event.id)
		setStartDate(dayjs(info.event.start).format('YYYY-MM-DDTHH:mm'));
		setEndDate(dayjs(info.event.end).format('YYYY-MM-DDTHH:mm'));
		setDescription(info.event.title);
		setNotes(info.event.extendedProps.notes)
		setRepeat(info.event.extendedProps.rept)
		setIsOpen(true)
	}, [event]);

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
				  rept: 0
				};
				// 스케줄을 비동기적으로 저장
				await setSchedule(newSchedule);
			  }
		} else {
			setSchedule({
				id: id,
				description: description,
				start: startDate,
				end: endDate,
				notes: notes,
				allday: true,
				rept: 0
			})
		}

		setTimeout(() => {
			getScheduleList();
		}, 100);
		setIsOpen(false);
	}, [id, description, startDate, endDate, notes, repeat]);

	const onCancel = useCallback(()=>{
		setIsOpen(false)
	}, [event]);

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
						action: {
							label: "닫기",
							onClick: () => console.log("닫기"),
						},
					});
				}
			})
		}
	  }, [event]);

	const onEventDrop = useCallback((e)=>{
		const { id, start, end, title:description, extendedProps } = e.event;
		const startDate = dayjs(start).format('YYYY-MM-DDTHH:mm');
		const endDate = dayjs(end).format('YYYY-MM-DDTHH:mm');
		setSchedule({
			id: id,
			description: description,
			start: startDate,
			end: endDate,
			notes: extendedProps.notes,
			allday: true,
			rept: 0
		});
	}, [])

	return (
		<div className={css.cardContainer}>
			<div className={css.calendarContainer}>
				<div className={css.toolContainer}>
					<Select>
						<SelectTrigger >
							<SelectValue placeholder="구분" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
							{myBldList.map(list => {
								return <SelectItem value={list.id} key={list.address + list.id} onClick={() => setSelectedBuilding(list)}>{`${list.address}`}</SelectItem>
							})}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
				<div style={{ display:'grid' }}>
					<FullCalendar
						plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
						initialView={'dayGridMonth'}
						locale={koLocale}
						// headerToolbar={
						// 	{
						// 		start: 'prevYear,prev',
						// 		center: 'title',
						// 		end: 'next,nextYear today dayGridMonth,dayGridWeek,listMonth'
						// 		// end: 'addEventButton dayGridMonth,dayGridWeek,dayGridDay,listMonth'
						// 	}
						// }
						editable={true}
						eventDurationEditable={true}
						height="auto"
						droppable={true}
						dateClick={onAddEvent}
						eventClick={onEditEvent}
						events={event}
						// customButtons={{
						// 		addEventButton: {
						// 			text: '일정추가',
						// 			click: () => onAddEvent(),
						// 		}
						// 	}
						// }
						eventDrop={onEventDrop}
					/>
				</div>
				<Sheet open={isOpen} onOpenChange={setIsOpen}>
					<SheetTrigger asChild />
					<SheetContent className={css.sheetContent}>
						<div className={css.addressForm}>
							<div className={css.row}>
								<input className={css.textInput} type="text" value={description} placeholder="내용을 입력하세요" onChange={(e) => setDescription(e.target.value)}/>
							</div>
							<div className={css.row}>
								<Select>
									<SelectTrigger>
										<SelectValue placeholder="입출금 구분" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
										{depositStatus.map(list => {
											return <SelectItem value={list.value} key={list.title}>{list.title}</SelectItem>
										})}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
							<div className={css.row}>
								<input className={css.textInput} type="text" value={description} placeholder="대상을 입력하세요" onChange={(e) => setDescription(e.target.value)}/>
							</div>
							<div className={css.row}>
								<input className={css.textInput} type="number" value={description} placeholder="금액을 입력하세요" onChange={(e) => setDescription(e.target.value)}/>
							</div>
							<div className={css.row}>
								<input className={css.textInput} type="number" value={description} placeholder="금리를 입력하세요" onChange={(e) => setDescription(e.target.value)}/>
							</div>
							<div className={css.row}>
								<input className={css.textInput} type="datetime-local" value={startDate} placeholder="시작일" onChange={(e) => setStartDate(e.target.value)}/>
							</div>
							<div className={css.row}>
								<input className={css.textInput} type="datetime-local" value={endDate} placeholder="종료일" onChange={(e) => setEndDate(e.target.value)}/>
							</div>
							<div className={css.row}>
								<input className={css.textInput} type="text" value={repeat} placeholder="반복(개월)" onChange={(e) => setRepeat(e.target.value)}/>
							</div>
							<div className={css.row}>
								<Textarea className='h-[100px]' value={notes}  placeholder="비고" onChange={(e) => setNotes(e.target.value)}/>
							</div>
							<div className={css.buttonWrap}>
								<Button type='button' onClick={onSave} >{id ? '수정' : '저장'}</Button>
								<Button variant="secondary" type='button' onClick={onCancel}>취소</Button>
								{id && <Button variant="destructive" type='button' onClick={onDelete}>삭제</Button>}
							</div>
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</div>
	);
}
