import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookById, savePhotos } from "@/lib/db";
import { draftStatus, isLocked } from "@/lib/listing";

const bodySchema = z.object({
  coverDataUrl: z.string().optional(),
  backDataUrl: z.string().optional(),
});

function imageOrNull(value: string | undefined): string | null {
  return value?.startsWith("data:image/") ? value : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const target = getBookById(id);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isLocked(target.status)) {
    return NextResponse.json(
      { error: "This draft is locked right now. Photos were not saved.", book: target },
      { status: 409 },
    );
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cover = imageOrNull(parsed.data.coverDataUrl);
  const back = imageOrNull(parsed.data.backDataUrl);
  if (!cover && !back) {
    return NextResponse.json({ error: "Send a cover or a back-cover image." }, { status: 400 });
  }

  const coverUrl = cover ?? target.coverUrl;
  const updated = savePhotos(target.id, {
    status: draftStatus({ coverUrl, description: target.description }),
    coverUrl,
    coverSource: cover ? "shop-photo" : target.coverSource,
    backCoverUrl: back ?? target.backCoverUrl,
  });

  return NextResponse.json({ book: updated });
}
