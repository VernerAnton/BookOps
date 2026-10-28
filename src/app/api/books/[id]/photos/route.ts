import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookById, saveEnrichment } from "@/lib/db";
import { mockExtractDescriptionFromPhotos } from "@/lib/enrichment";

const bodySchema = z.object({
  coverDataUrl: z.string().optional(),
  backDataUrl: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const target = getBookById(id);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let coverUrl = target.coverUrl;
  if (parsed.data.coverDataUrl?.startsWith("data:image")) {
    coverUrl = parsed.data.coverDataUrl;
  }

  let description = target.description;
  if (parsed.data.backDataUrl) {
    description = mockExtractDescriptionFromPhotos();
  }

  const updated = saveEnrichment(target.id, {
    status: "ready_for_review",
    coverUrl,
    coverSource: parsed.data.coverDataUrl ? "mobile-camera" : target.coverSource,
    description,
  });

  return NextResponse.json({ book: updated });
}
