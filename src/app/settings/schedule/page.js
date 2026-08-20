"use client";

import { Toaster } from "sonner";

import ScheduleSettings from "@/components/settings/scheduleSettings";

export default function Page() {
	return (
		<div>
			<ScheduleSettings/>
			<Toaster position="top-right" richColors />
		</div>
	);
}
