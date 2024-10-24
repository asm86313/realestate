"use client";

import { usePathname, useSearchParams, useParams } from 'next/navigation';
import List from "@/components/rsms/list";
import { getBldInfo } from "@/utils/core";
import { useSelector, useDispatch } from 'react-redux';
import { setBuildings, setContracts, buildingsState } from "@/app/slices/storeSlice";
import { useCallback, useEffect, useState } from 'react';


export default function page() {
  const dispatch = useDispatch();

  const getBldList = useCallback(async() => {
    const res = await getBldInfo();
    if(res) {
      dispatch(setBuildings(res.data.Buildings))
      dispatch(setContracts(res.data.Contracts))
    }
  }, [])

  useEffect(() => {
    getBldList();
  }, [])

  return (
    <div>
      <List />
    </div>
  );
}
