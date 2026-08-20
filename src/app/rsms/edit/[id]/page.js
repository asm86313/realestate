"use client";

import Write from "@/components/rsms/write";
import { Toaster } from "sonner";

export default function Page() {
  return (
    <div>
      <Write/>
      <Toaster position="top-right" richColors />
    </div>
  );
}
