import { NextResponse } from "next/server";
import { getBookById } from "@/lib/db";
import { runEnrichment } from "@/lib/enrichment-job";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = getBookById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const book = await runEnrichment(id);
  return NextResponse.json({ book });
}
