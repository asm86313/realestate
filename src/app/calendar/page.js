"use client";

import { Toaster } from "sonner";

import Calendar from '@/components/calendar/calendar';

export default function Page() {
	return (
		<div>
			<Calendar/>
			<Toaster position="top-right" richColors /> {/* Toast Provider */}
		</div>
	);
}
