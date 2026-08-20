"use client"; // 클라이언트 컴포넌트 선언

import { useRouter } from 'next/navigation';
import { useCallback, } from 'react';
import TanstackTable from "@/components/tanstackTable/tanstackTable";
import { useBldInfoQuery } from "@/hooks/queries";

export default function List() {
	const router = useRouter();
	const { data } = useBldInfoQuery();
	const bldList = data?.Buildings ?? [];

	const handleButtonClick = useCallback(() => {
		router.push("/rsms/write");
	}, []);


	const onClickList = useCallback((cell)=> {
		router.push(`/rsms/edit/${cell.row.original.id}`);
	}, [])

	return (
		<div className="mx-auto w-full max-w-5xl px-2 py-4 sm:px-4">
			<div className="mb-4">
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">건물리스트</h1>
				<p className="text-sm text-muted-foreground">등록된 건물과 계약 현황을 확인하세요.</p>
			</div>
			<TanstackTable bldList={bldList} onClickList={onClickList} onRegister={handleButtonClick}/>
		</div>
	);
}
