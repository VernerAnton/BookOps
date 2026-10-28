import { NextResponse } from "next/server";
import { z } from "zod";
import { createBook, listBooks } from "@/lib/db";
import { runEnrichment } from "@/lib/enrichment-job";

const createSchema = z.object({
  isbn: z.string().min(8).max(20),
  autoEnrich: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const books = listBooks(status as never);
  return NextResponse.json({ books });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const book = createBook({ isbn: parsed.data.isbn });
  let enriched = book;
  if (parsed.data.autoEnrich) {
    enriched = (await runEnrichment(book.id)) ?? book;
  }
  return NextResponse.json({ book: enriched }, { status: 201 });
}
