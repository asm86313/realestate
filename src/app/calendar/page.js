"use client";

import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useState } from 'react';

import { setSchedule } from "@/app/slices/storeSlice";
import { getSchedule } from "@/utils/core";
import { userData } from "@/app/slices/storeSlice";

import { Toaster } from "sonner";

import Calendar from '@/components/calendar/calendar';
import css from "./layout.module.css";

export default function page() {
	const dispatch = useDispatch();
	const user = useSelector(userData);

	const getScheduleList = useCallback(async() => {
	  	const res = await getSchedule();
	  	if (res) {
			dispatch(setSchedule(res.data.Schedule))
	  	}
	}, [])

	useEffect(() => {
		getScheduleList();
	}, [])

	return (
		<div>
			{!user &&
				<div className={css.wrap}>
					로그인 후 사용 가능 합니다.
				</div>
			}
			<Calendar getScheduleList={getScheduleList}/>
			<Toaster position="top-right" richColors /> {/* Toast Provider */}
		</div>
	);
}
