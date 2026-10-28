import type { BookRecord } from "./types";

/** Simulates Antikvaari BookAPI publish / mass-update until real credentials exist. */
export async function mockPublishToAntikvaari(
  book: BookRecord,
): Promise<{ listingId: string; listingUrl: string }> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

  if (!book.title || !book.price || !book.condition) {
    throw new Error("Puuttuvia pakollisia kenttiä (otsikko, hinta, kunto).");
  }

  const listingId = `POC-${book.isbn}-${Date.now().toString(36)}`;
  const slug = book.title
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
  const listingUrl = `https://www.antikvaari.fi/teos/${slug}/${listingId}`;

  return { listingId, listingUrl };
}
