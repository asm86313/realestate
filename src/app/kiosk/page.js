"use client";

import List from "@/components/kiosk/orderTable";
import { getBldInfo } from "@/utils/core";
import { useDispatch } from 'react-redux';
import { setBuildings, setContracts } from "@/app/slices/storeSlice";
import { useCallback, useEffect } from 'react';


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
    <List/>
  );
}
