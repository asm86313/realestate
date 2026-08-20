"use client";

import { Toaster } from "sonner";

import Settings from "@/components/settings/settings";

export default function Page() {
	return (
		<div>
			<Settings/>
			<Toaster position="top-right" richColors />
		</div>
	);
}
