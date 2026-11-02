import type { Book } from "@/lib/types";
import { MOCK_BLURB } from "@/lib/types";
import { createSeed } from "@/lib/seed";

const catalog = new Map(createSeed().map((book) => [book.isbn, book]));

export function completeEnrichment(book: Book): Book {
  const known = catalog.get(book.isbn);
  if (!known || known.status === "needs_photo") {
    return {
      ...book,
      title: "No record for this ISBN",
      author: "Author missing",
      description: "",
      coverUrl: null,
      coverSource: null,
      backCoverUrl: null,
      blurbSource: null,
      market: {
        copies: 0,
        lowest: null,
        conditionSpread: "No copies in the sample",
        inPrint: null,
        printNote: "Sample lookup found no print status.",
      },
      suggestion: null,
      price: "",
      status: "needs_photo",
    };
  }

  return {
    ...known,
    id: book.id,
    condition: null,
    quantity: 1,
    location: "",
    price: known.suggestion ? known.suggestion.recommend.toFixed(2) : "",
    status: "ready",
    listingNote: null,
    scannedAt: book.scannedAt,
  };
}

export function applyBookPatch(book: Book, patch: Partial<Book>): Book {
  if (book.status === "live" || book.status === "enriching") return book;
  const next: Book = { ...book, ...patch };

  const hasCopy = Boolean(next.coverUrl && next.description.trim());
  if (!hasCopy) return { ...next, status: "needs_photo" };
  if (next.status === "needs_photo") return { ...next, status: "ready" };
  return next;
}

export function backCoverPatch(book: Book, dataUrl: string): Partial<Book> {
  if (book.description.trim()) {
    return { backCoverUrl: dataUrl };
  }
  return {
    backCoverUrl: dataUrl,
    description: MOCK_BLURB,
    blurbSource: "Mock read from the back-cover photo",
  };
}
