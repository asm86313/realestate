"use client";

import { Toaster } from "sonner";

import LedgerHome from '@/components/ledger/ledgerHome';

export default function Page() {
	return (
		<div>
			<LedgerHome/>
			<Toaster position="top-right" richColors /> {/* Toast Provider */}
		</div>
	);
}
