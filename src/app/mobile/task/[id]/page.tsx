import { Suspense } from "react";
import { MobileTaskClient } from "@/components/mobile-task-client";

export const instant = false;

export default function MobileTaskPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm">Ladataan…</p>}>
      <MobileTaskClient />
    </Suspense>
  );
}
