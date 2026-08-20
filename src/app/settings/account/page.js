"use client";

import { Toaster } from "sonner";

import AccountSettings from "@/components/settings/accountSettings";

export default function Page() {
	return (
		<div>
			<AccountSettings/>
			<Toaster position="top-right" richColors />
		</div>
	);
}
