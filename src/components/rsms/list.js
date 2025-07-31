"use client"; // 클라이언트 컴포넌트 선언

import { useRouter } from 'next/navigation';
import { useCallback, } from 'react';
import { useSelector  } from 'react-redux';
import css from './list.module.css';
import TanstackTable from "@/components/tanstackTable/tanstackTable";
import { buildingsState } from "@/app/slices/storeSlice";

export default function List() {
	const router = useRouter();
	const bldList = useSelector(buildingsState);

	const handleButtonClick = useCallback(() => {
		router.push("/rsms/write");
	}, []);


	const onClickList = useCallback((cell)=> {
		router.push(`/rsms/edit/${cell.row.original.id}`);
	}, [])

	return (
		<div className={css.cardContainer}>
			<div className={css.tableWrap}>
				<TanstackTable bldList={bldList} onClickList={onClickList} onRegister={handleButtonClick}/>
			</div>
		</div>
	);
}