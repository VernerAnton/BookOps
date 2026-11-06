import type { BookStatus } from "@/lib/types";

export const statusLabel: Record<BookStatus, string> = {
  queued: "Queued",
  enriching: "Reading",
  needs_photo: "Needs photo",
  ready_for_review: "Ready",
  approved: "Accepted",
  publishing: "Sending",
  live: "Listed",
  failed: "Lookup failed",
};

export const statusStripe: Record<BookStatus, string> = {
  queued: "bg-signal blink",
  enriching: "bg-signal blink",
  needs_photo: "bg-hot",
  ready_for_review: "bg-signal",
  approved: "bg-live",
  publishing: "bg-live blink",
  live: "bg-live",
  failed: "bg-hot",
};

const statusTone: Record<BookStatus, string> = {
  queued: "bg-signal text-on-signal blink",
  enriching: "bg-signal text-on-signal blink",
  needs_photo: "bg-hot text-white",
  ready_for_review: "bg-signal text-on-signal",
  approved: "bg-live text-on-live",
  publishing: "bg-live text-on-live blink",
  live: "bg-live text-on-live",
  failed: "bg-hot text-white",
};

export function StatusMark({ status }: { status: BookStatus }) {
  return (
    <p className={`px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] ${statusTone[status]}`}>
      {statusLabel[status]}
    </p>
  );
}
