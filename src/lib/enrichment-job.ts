import { lookupAntikvaari, recommendedPrice } from "./antikvaari";
import { createMobileTaskToken, fetchOpenLibrary } from "./enrichment";
import { getBookById, saveEnrichment } from "./db";
import type { BookRecord } from "./types";

export async function runEnrichment(bookId: string): Promise<BookRecord | null> {
  const book = getBookById(bookId);
  if (!book) return null;

  saveEnrichment(bookId, { status: "enriching", errorMessage: null });

  try {
    const [antik, ol] = await Promise.all([
      lookupAntikvaari(book.isbn),
      fetchOpenLibrary(book.isbn),
    ]);
    const pricing = recommendedPrice(antik.market, antik.inPrint);
    const title = antik.title || ol.title || `Teos (ISBN ${book.isbn})`;
    const author = antik.author || ol.author;
    const description = antik.description || ol.description;
    const coverUrl = antik.coverUrl || ol.coverUrl;
    const coverSource = antik.coverUrl
      ? "antikvaari"
      : ol.coverUrl
        ? "openlibrary"
        : null;

    const missingCover = !coverUrl;
    const missingDescription = !description || description.length < 40;
    const status = missingCover || missingDescription ? "needs_photo" : "ready_for_review";

    return saveEnrichment(bookId, {
      status,
      title,
      author,
      description,
      suggestedPriceMin: pricing.min,
      suggestedPriceMax: pricing.max,
      price: pricing.recommended,
      coverUrl,
      coverSource,
      inPrint: antik.inPrint,
      market: antik.market,
      mobileTaskToken:
        status === "needs_photo"
          ? (book.mobileTaskToken ?? createMobileTaskToken())
          : book.mobileTaskToken,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Rikastus epäonnistui";
    return saveEnrichment(bookId, {
      status: "failed",
      errorMessage: message,
    });
  }
}
