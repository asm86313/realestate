"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import Write from "@/components/rsms/write";


export default function page() {
  const pathname = usePathname(); // 현재 경로 가져오기
  const searchParams = useSearchParams(); // 쿼리 파라미터 가져오기
  console.log("Current Pathname:", pathname);
  console.log("Search Params:", searchParams.toString());
  return (
    <div>
      <Write/>
    </div>
  );
}
