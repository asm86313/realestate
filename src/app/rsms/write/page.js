"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import Write from "@/components/rsms/write";
import { Toaster } from "sonner";


export default function Page() {
  const pathname = usePathname(); // 현재 경로 가져오기
  const searchParams = useSearchParams(); // 쿼리 파라미터 가져오기

  return (
    <div>
      <Write/>
      <Toaster position="top-right" richColors />
    </div>
  );
}
