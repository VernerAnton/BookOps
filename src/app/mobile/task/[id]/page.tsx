import { Suspense } from "react";
import { PhoneTask } from "@/components/phone-task";

export const instant = false;

export default function MobileTaskPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center font-cond text-2xl">Loading the task</p>}>
      <PhoneTask />
    </Suspense>
  );
}
