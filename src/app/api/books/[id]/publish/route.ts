import { NextResponse } from "next/server";
import { getBookById, updateBook } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const book = getBookById(id);
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!book.title || book.price == null || !book.condition) {
    return NextResponse.json(
      {
        error: "Täytä otsikko, hinta ja kunto ennen hyväksyntää.",
        book,
      },
      { status: 422 },
    );
  }

  const updated = updateBook(id, { status: "approved" });
  return NextResponse.json({
    book: updated,
    message:
      "Luonnos hyväksytty. Antikvaariin lähtö kytketään, kun BookAPI-tunnukset ovat käytössä. Hinta ja teksti pysyvät tässä vedoksessa.",
  });
}
