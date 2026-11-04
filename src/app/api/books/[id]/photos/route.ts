import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookById, saveEnrichment } from "@/lib/db";

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

  const description = target.description;
  const hasBackPhoto = Boolean(parsed.data.backDataUrl);
  const ready = Boolean(coverUrl) && Boolean(description && description.length >= 40);

  const updated = saveEnrichment(target.id, {
    status: ready ? "ready_for_review" : "needs_photo",
    title: target.title,
    author: target.author,
    description,
    suggestedPriceMin: target.suggestedPriceMin,
    suggestedPriceMax: target.suggestedPriceMax,
    price: target.price,
    coverUrl,
    coverSource: parsed.data.coverDataUrl ? "mobile-camera" : target.coverSource,
    inPrint: target.inPrint,
    market: target.market,
    errorMessage: hasBackPhoto
      ? "Takakannen kuva tallennettu. Kirjoita takateksti kuvaukseen."
      : null,
  });

  return NextResponse.json({ book: updated });
}
