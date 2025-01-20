"use client";

import { usePathname, useSearchParams, useParams } from 'next/navigation';
import Write from "@/components/rsms/write";
import { getBldInfo } from "@/utils/core";
import { useSelector, useDispatch } from 'react-redux';
import { setBuildings, setContracts, buildingsState } from "@/app/slices/storeSlice";
import { useCallback, useEffect, useState } from 'react';


export default function page() {
  const pathname = usePathname(); // 현재 경로 가져오기
  const searchParams = useParams(); // 쿼리 파라미터 가져오기
  const dispatch = useDispatch();

  const getBldList = async() => {
    const res = await getBldInfo();
    if(res) {
      console.log(res.data)
      dispatch(setBuildings(res.data.Buildings))
      dispatch(setContracts(res.data.Contracts))
    }
  }

  useEffect(() => {

    getBldList();
  }, [])

  return (
    <div>
      <Write/>
    </div>
  );
}
