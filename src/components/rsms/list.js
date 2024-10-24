"use client"; // 클라이언트 컴포넌트 선언

import { useRouter } from 'next/navigation';
import { getBldInfo } from "@/utils/core";
import { useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import css from './list.module.css';
import TanstackTable from "@/components/tanstackTable/tanstackTable";
import { setBuildings, buildingsState } from "@/app/slices/storeSlice";

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
    <div>
		    <TanstackTable bldList={bldList} onClickList={onClickList}/>
      	<button className={css.button} type="button" onClick={handleButtonClick}>{'등록'}</button>
    </div>
  );
}
