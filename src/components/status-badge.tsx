import { cn } from "@/lib/utils";
import type { BookStatus } from "@/lib/types";

const labels: Record<BookStatus, string> = {
  queued: "Jonossa",
  enriching: "Rikastetaan",
  needs_photo: "Tarvitsee kuvan",
  ready_for_review: "Tarkistettavana",
  approved: "Hyväksytty",
  publishing: "Julkaistaan",
  live: "Myynnissä",
  failed: "Virhe",
};

const styles: Record<BookStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  enriching: "bg-blue-100 text-blue-800",
  needs_photo: "bg-amber-100 text-amber-900",
  ready_for_review: "bg-indigo-100 text-indigo-900",
  approved: "bg-violet-100 text-violet-900",
  publishing: "bg-cyan-100 text-cyan-900",
  live: "bg-emerald-100 text-emerald-900",
  failed: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: BookStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

export function statusLabel(status: BookStatus) {
  return labels[status];
}
