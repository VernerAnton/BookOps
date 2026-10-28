import { Suspense } from "react";
import { BookReviewClient } from "@/components/book-review-client";

export const instant = false;

export default async function BookReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="p-8 text-sm">Ladataan…</p>}>
      <BookReviewClient id={id} />
    </Suspense>
  );
}
