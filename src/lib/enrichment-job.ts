import {
  createMobileTaskToken,
  fetchOpenLibrary,
  mockAntikvaariMarket,
  mockInPrint,
  suggestPriceRange,
} from "./enrichment";
import { getBookById, saveEnrichment } from "./db";
import type { BookRecord } from "./types";

export async function runEnrichment(bookId: string): Promise<BookRecord | null> {
  const book = getBookById(bookId);
  if (!book) return null;

  saveEnrichment(bookId, { status: "enriching", errorMessage: null });

  try {
    const market = mockAntikvaariMarket(book.isbn);
    const inPrint = mockInPrint(book.isbn);
    const ol = await fetchOpenLibrary(book.isbn);
    const pricing = suggestPriceRange(market, inPrint);

    const title =
      ol.title ??
      (book.title || `Teos (ISBN ${book.isbn})`);
    const author = ol.author;
    const description = ol.description;
    const coverUrl = ol.coverUrl;

    const missingCover = !coverUrl;
    const missingDescription = !description || description.length < 40;

    if (missingCover || missingDescription) {
      const token = book.mobileTaskToken ?? createMobileTaskToken();
      return saveEnrichment(bookId, {
        status: "needs_photo",
        title,
        author,
        description,
        suggestedPriceMin: pricing.min,
        suggestedPriceMax: pricing.max,
        price: pricing.recommended,
        coverUrl,
        coverSource: coverUrl ? "openlibrary" : null,
        inPrint,
        market,
        mobileTaskToken: token,
      });
    }

    return saveEnrichment(bookId, {
      status: "ready_for_review",
      title,
      author,
      description,
      suggestedPriceMin: pricing.min,
      suggestedPriceMax: pricing.max,
      price: pricing.recommended,
      coverUrl,
      coverSource: "openlibrary",
      inPrint,
      market,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Rikastus epäonnistui";
    return saveEnrichment(bookId, {
      status: "failed",
      errorMessage: message,
    });
  }
}
