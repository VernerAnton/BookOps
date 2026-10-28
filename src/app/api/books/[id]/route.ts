import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookById, updateBook } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
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
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const book = updateBook(id, parsed.data);
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ book });
}
