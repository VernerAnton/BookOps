import type { BookStatus } from "./types";

/** A blurb shorter than this is treated as missing. */
export const MIN_BLURB = 40;

export function hasListingCopy(book: {
  coverUrl: string | null;
  description: string | null;
}): boolean {
  return Boolean(book.coverUrl) && (book.description?.trim().length ?? 0) >= MIN_BLURB;
}

/** The lookup is still running. */
export function isReading(status: BookStatus): boolean {
  return status === "queued" || status === "enriching";
}

/** Accept has happened. The snapshot no longer changes. */
export function isAccepted(status: BookStatus): boolean {
  return status === "approved" || status === "publishing" || status === "live";
}

export function isLocked(status: BookStatus): boolean {
  return isReading(status) || isAccepted(status);
}

/** Status of an open draft, from whether it has a cover and a blurb. */
export function draftStatus(book: {
  coverUrl: string | null;
  description: string | null;
}): "needs_photo" | "ready_for_review" {
  return hasListingCopy(book) ? "ready_for_review" : "needs_photo";
}
