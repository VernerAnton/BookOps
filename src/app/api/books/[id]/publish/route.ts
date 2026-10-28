import { NextResponse } from "next/server";
import { getBookById, savePublishResult, updateBook } from "@/lib/db";
import { mockPublishToAntikvaari } from "@/lib/antikvaari-mock";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const book = getBookById(id);
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  updateBook(id, { status: "publishing" });

  try {
    const { listingId, listingUrl } = await mockPublishToAntikvaari(book);
    const updated = savePublishResult(id, {
      status: "live",
      antikvaariListingId: listingId,
      antikvaariListingUrl: listingUrl,
    });
    return NextResponse.json({
      book: updated,
      mock: true,
      message: "POC: Julkaisu simuloitu (Antikvaari BookAPI mock).",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Julkaisu epäonnistui";
    const updated = savePublishResult(id, {
      status: "failed",
      antikvaariListingId: "",
      antikvaariListingUrl: "",
      errorMessage: message,
    });
    return NextResponse.json({ book: updated, error: message }, { status: 422 });
  }
}
