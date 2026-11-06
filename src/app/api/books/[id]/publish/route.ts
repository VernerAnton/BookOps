import { NextResponse } from "next/server";
import { getBookById, updateBook } from "@/lib/db";
import { hasListingCopy, isAccepted, isReading, MIN_BLURB } from "@/lib/listing";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const book = getBookById(id);
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isAccepted(book.status)) {
    return NextResponse.json({ error: "This draft is already accepted.", book }, { status: 409 });
  }
  if (isReading(book.status)) {
    return NextResponse.json({ error: "The lookup is still running.", book }, { status: 409 });
  }

  const missing: string[] = [];
  if (!book.title?.trim()) missing.push("a title");
  if (book.price == null) missing.push("a final price");
  if (!book.condition) missing.push("a condition (K1–K5)");
  if (!hasListingCopy(book)) missing.push(`a cover and a blurb of at least ${MIN_BLURB} characters`);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Accept needs ${missing.join(", ")}.`, book },
      { status: 422 },
    );
  }

  const updated = updateBook(id, { status: "approved" });
  return NextResponse.json({
    book: updated,
    message:
      "Accepted. This snapshot is saved in BookOps. It goes to Antikvaari once BookAPI is connected; the price and text stay as they are now.",
  });
}
