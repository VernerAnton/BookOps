import { randomUUID } from "crypto";
import type { ConditionGrade, MarketSnapshot } from "./types";

function hashIsbn(isbn: string): number {
  let h = 0;
  for (let i = 0; i < isbn.length; i++) {
    h = (h * 31 + isbn.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function mockAntikvaariMarket(isbn: string): MarketSnapshot {
  const h = hashIsbn(isbn);
  const count = (h % 7) + 1;
  const sellers = [
    "Antikvariaatti Example",
    "Kirjakauppa Pohjoinen",
    "Divari Meri",
    "Antologia Antikvaari",
  ];
  const conditions: ConditionGrade[] = ["K2", "K3", "K3", "K4", "K5"];
  const listings = Array.from({ length: count }, (_, i) => {
    const base = 5 + (h % 40) + i * 2.5;
    return {
      seller: sellers[(h + i) % sellers.length],
      price: Math.round(base * 100) / 100,
      condition: conditions[(h + i) % conditions.length],
    };
  }).sort((a, b) => a.price - b.price);

  const prices = listings.map((l) => l.price);
  return {
    listingCount: listings.length,
    lowestPrice: prices[0] ?? null,
    highestPrice: prices[prices.length - 1] ?? null,
    listings,
    searchedAt: new Date().toISOString(),
  };
}

export function mockInPrint(isbn: string): boolean {
  return hashIsbn(isbn) % 3 !== 0;
}

export function suggestPriceRange(
  market: MarketSnapshot,
  inPrint: boolean,
): { min: number; max: number; recommended: number } {
  const anchor = market.lowestPrice ?? 12;
  const scarcity = market.listingCount <= 2 ? 1.15 : 1;
  const printFactor = inPrint ? 0.95 : 1.1;
  const recommended = Math.round(anchor * scarcity * printFactor * 100) / 100;
  const min = Math.round(recommended * 0.9 * 100) / 100;
  const max = Math.round(recommended * 1.15 * 100) / 100;
  return { min, max, recommended };
}

interface OpenLibraryWork {
  title?: string;
  authors?: { name?: string }[];
  description?: string | { value?: string };
  covers?: number[];
}

export async function fetchOpenLibrary(isbn: string): Promise<{
  title: string | null;
  author: string | null;
  description: string | null;
  coverUrl: string | null;
}> {
  try {
    const res = await fetch(
      `https://openlibrary.org/isbn/${isbn}.json`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) {
      return { title: null, author: null, description: null, coverUrl: null };
    }
    const data = (await res.json()) as OpenLibraryWork;
    let description: string | null = null;
    if (typeof data.description === "string") {
      description = data.description;
    } else if (data.description?.value) {
      description = data.description.value;
    }
    const author =
      data.authors?.[0]?.name ??
      (await fetchAuthorFromWorks(isbn)) ??
      null;
    const coverId = data.covers?.[0];
    const coverUrl = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

    const coverHead = await fetch(coverUrl, { method: "HEAD" });
    const validCover = coverHead.ok ? coverUrl : null;

    return {
      title: data.title ?? null,
      author,
      description,
      coverUrl: validCover,
    };
  } catch {
    return { title: null, author: null, description: null, coverUrl: null };
  }
}

async function fetchAuthorFromWorks(isbn: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?isbn=${isbn}&limit=1`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      docs?: { author_name?: string[]; title?: string }[];
    };
    return json.docs?.[0]?.author_name?.[0] ?? null;
  } catch {
    return null;
  }
}

export function createMobileTaskToken(): string {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}

export function mockExtractDescriptionFromPhotos(): string {
  return (
    "POC: Teksti poimittu takakannen kuvasta. Tarkista ja muokkaa tarvittaessa ennen julkaisua. " +
    "Teos käsittelee aihetta laajasti; kansipaperit ja selkämys hyvässä kunnossa."
  );
}
