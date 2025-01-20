"use client";

import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useState } from 'react';

import { setSchedule, setBuildings, setContracts, userData } from "@/app/slices/storeSlice";
import { getSchedule, getBldInfo } from "@/utils/core";

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

	const getBldList = useCallback(async() => {
		const res = await getBldInfo();
		if(res) {
		  dispatch(setBuildings(res.data.Buildings))
		  dispatch(setContracts(res.data.Contracts))
		}
	  }, [])

	useEffect(() => {
		getScheduleList();
		getBldList();
	}, [])

	return (
		<div>
			<Calendar getScheduleList={getScheduleList}/>
			<Toaster position="top-right" richColors /> {/* Toast Provider */}
		</div>
	);
}
