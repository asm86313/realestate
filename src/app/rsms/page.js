"use client";

import List from "@/components/rsms/list";
import { Toaster } from "sonner";

export default function Page() {
  return (
    <div>
      <List/>
      <Toaster position="top-right" richColors />
    </div>
  );
}
