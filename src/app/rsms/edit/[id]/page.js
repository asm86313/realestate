"use client";

import { usePathname, useSearchParams, useParams } from 'next/navigation';
import Write from "@/components/rsms/write";
import { getBldInfo } from "@/utils/core";
import { useSelector, useDispatch } from 'react-redux';
import { setBuildings, setContracts, buildingsState } from "@/app/slices/storeSlice";
import { useCallback, useEffect, useState } from 'react';
import { Toaster } from "sonner";

export default function Page() {
  const pathname = usePathname(); // 현재 경로 가져오기
  const searchParams = useParams(); // 쿼리 파라미터 가져오기
  const dispatch = useDispatch();



  useEffect(() => {
    const getBldList = async() => {
    const res = await getBldInfo();
    if(res) {
      console.log(res.data)
      dispatch(setBuildings(res.data.Buildings))
      dispatch(setContracts(res.data.Contracts))
    }
  }
    getBldList();
  }, [dispatch])

  return (
    <div>
      <Write/>
      <Toaster position="top-right" richColors /> 
    </div>
  );
}
