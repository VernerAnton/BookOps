import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookById, updateBook } from "@/lib/db";
import { draftStatus, isAccepted, isReading } from "@/lib/listing";

const updateSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive().nullable().optional(),
  condition: z.enum(["K1", "K2", "K3", "K4", "K5"]).optional(),
  internalQty: z.number().int().positive().optional(),
  internalLocation: z.string().optional(),
  internalNotes: z.string().optional(),
  status: z
    .enum([
      "queued",
      "enriching",
      "needs_photo",
      "ready_for_review",
      "approved",
      "publishing",
      "live",
      "failed",
    ])
    .optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const book = getBookById(id);
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ book });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = getBookById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (isAccepted(existing.status)) {
    return NextResponse.json(
      { error: "This draft is accepted. Its text, price, and photo are locked.", book: existing },
      { status: 409 },
    );
  }
  if (isReading(existing.status)) {
    return NextResponse.json(
      { error: "The lookup is still running. Edit once it finishes.", book: existing },
      { status: 409 },
    );
  }

  let book = updateBook(id, parsed.data);
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // An open draft is "ready" once it has a cover and a blurb, however they got there.
  const open =
    book.status === "needs_photo" ||
    book.status === "ready_for_review" ||
    book.status === "failed";
  if (!parsed.data.status && open) {
    const next = draftStatus(book);
    if (next !== book.status) book = updateBook(id, { status: next }) ?? book;
  }

  return NextResponse.json({ book });
}
