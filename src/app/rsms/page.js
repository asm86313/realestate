"use client";

import List from "@/components/rsms/list";
import { getBldInfo } from "@/utils/core";
import { useDispatch } from 'react-redux';
import { setBuildings, setContracts } from "@/app/slices/storeSlice";
import { useCallback, useEffect } from 'react';

import { Toaster } from "sonner";


export default function Page() {
  const dispatch = useDispatch();

  const getBldList = useCallback(async(a) => {
    const res = await getBldInfo(a);
    if(res) {
      dispatch(setBuildings(res.data.Buildings))
      dispatch(setContracts(res.data.Contracts))
    }
  }, [])

  useEffect(() => {
    getBldList(1);
    getBldList(2);
    getBldList(3);
    getBldList(4);
  }, [])

  return (
    <div>
      <List/>
      <Toaster position="top-right" richColors />
    </div>
  );
}
