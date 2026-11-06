import { NextResponse } from "next/server";
import { getBookById } from "@/lib/db";
import { runEnrichment } from "@/lib/enrichment-job";
import { isAccepted } from "@/lib/listing";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = getBookById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isAccepted(existing.status)) {
    return NextResponse.json({ error: "This draft is already accepted.", book: existing }, { status: 409 });
  }
  const book = await runEnrichment(id);
  return NextResponse.json({ book });
}
