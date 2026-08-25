'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';

import { useBldInfoQuery, useLedgerQuery } from '@/hooks/queries';
import Ledger from '@/components/rsms/ledger';
import LedgerReports from '@/components/rsms/ledgerReports';
import { Select, SelectGroup, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

// 회계(입출금 장부)는 건물 단위 데이터라 - 어느 건물을 볼지 먼저 골라야 한다.
export default function LedgerHome() {
	const { data: bldInfo } = useBldInfoQuery();
	const bldList = bldInfo?.Buildings ?? [];
	const [selectedBldId, setSelectedBldId] = useState('');
	// Ledger 컴포넌트도 같은 쿼리를 쓰기 때문에(react-query가 캐시를 공유) 여기서
	// 따로 불러온다고 요청이 두 번 나가지 않는다.
	const { data: ledger = [] } = useLedgerQuery(selectedBldId);

	// 건물이 하나뿐이면 굳이 고르게 하지 않고 바로 보여준다.
	useEffect(() => {
		if (!selectedBldId && bldList.length === 1) {
			setSelectedBldId(String(bldList[0].id));
		}
	}, [bldList, selectedBldId]);

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-2 py-4 sm:px-4">
			<div>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">회계</h1>
				<p className="text-sm text-muted-foreground">건물별 입출금 장부를 확인하고 관리하세요.</p>
			</div>

			<Select value={selectedBldId} onValueChange={setSelectedBldId}>
				<SelectTrigger>
					<SelectValue placeholder="건물 선택" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{bldList.map((b) => (
							<SelectItem value={String(b.id)} key={b.id}>{b.address}</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>

			{selectedBldId ? (
				<>
					{/* 탭(전체/연도별/월별)과 상관없이 항상 보이도록 여기 둔다 */}
					<LedgerReports bldId={selectedBldId} ledger={ledger} />
					<Ledger bldId={selectedBldId} />
				</>
			) : (
				<Card>
					<CardContent className="flex flex-col items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
						<Wallet className="size-6" />
						회계장부를 볼 건물을 먼저 선택해주세요.
					</CardContent>
				</Card>
			)}
		</div>
	);
}
