"use client";

import { Toaster } from "sonner";

import LedgerTemplateSettings from "@/components/settings/ledgerTemplateSettings";

export default function Page() {
	return (
		<div>
			<LedgerTemplateSettings/>
			<Toaster position="top-right" richColors />
		</div>
	);
}
