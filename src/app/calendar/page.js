"use client";

import Calendar from '@/components/calendar/calendar';
import { useDispatch } from 'react-redux';
import { setSchedule } from "@/app/slices/storeSlice";
import { useCallback, useEffect } from 'react';
import { getSchedule } from "@/utils/core";
import { Toaster } from "sonner";

export default function page() {

	const dispatch = useDispatch();

	const getScheduleList = useCallback(async() => {
	  const res = await getSchedule();
	  if(res) {
		dispatch(setSchedule(res.data.Schedule))
	  }
	}, [])

	useEffect(() => {
		getScheduleList();
	  }, [])


	return (
		<div>
			<Calendar getScheduleList={getScheduleList}/>
			<Toaster position="top-right" richColors /> {/* Toast Provider */}
		</div>
	);
}
