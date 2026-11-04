import type { ConditionGrade, MarketListing, MarketSnapshot } from "./types";

const SEARCH = "https://www.antikvaari.fi/api/products/search-v2";

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function sameIsbn(a: string, b: string): boolean {
  const left = normalizeIsbn(a);
  const right = normalizeIsbn(b);
  return left.length > 0 && left === right;
}

export interface AntikvaariHit {
  title: string | null;
  author: string | null;
  description: string | null;
  coverUrl: string | null;
  inPrint: boolean | null;
  market: MarketSnapshot;
}

interface SearchDoc {
  title?: string;
  path?: string;
  priceFrom?: number;
  price?: number;
  availableCount?: number;
  vendorCount?: number;
}

interface CatalogPayload {
  title?: string;
  short_title?: string;
  isbn_13?: string;
  isbn_10?: string;
  description?: string;
  publisher?: string;
  year?: string;
  min_price?: string | number;
  new_items?: number;
  used_items?: number;
  authors?: { name?: string }[];
  enrichment?: { description?: string };
  catalog_img?: { url?: string };
}

interface SelectedOffer {
  hinta?: number;
  kunto?: string;
  ynimi?: string;
  kuvat?: string[];
}

export async function lookupAntikvaari(isbnRaw: string): Promise<AntikvaariHit> {
  const isbn = normalizeIsbn(isbnRaw);
  const searchedAt = new Date().toISOString();
  const empty = emptyHit(searchedAt, "ISBN:llä ei löytynyt Antikvaari-osumaa. Aseta hinta käsin.");

  if (isbn.length < 10) return empty;

  const search = await searchByIsbn(isbn);
  if (!search || search.totalDocs === 0 || search.totalDocs > 8) return empty;

  for (const doc of search.docs.slice(0, 3)) {
    if (!doc.path) continue;
    const page = await fetchTeos(doc.path);
    if (!page) continue;
    const catalogIsbn = page.catalog.isbn_13 || page.catalog.isbn_10 || "";
    const exact = sameIsbn(catalogIsbn, isbn);
    const onlyHit = search.totalDocs === 1 && !catalogIsbn;
    if (!exact && !onlyHit) continue;
    return hitFromCatalog(page, doc, searchedAt, exact);
  }

  return empty;
}

function emptyHit(searchedAt: string, reason: string): AntikvaariHit {
  return {
    title: null,
    author: null,
    description: null,
    coverUrl: null,
    inPrint: null,
    market: {
      listingCount: 0,
      lowestPrice: null,
      highestPrice: null,
      listings: [],
      searchedAt,
      catalogUrl: null,
      newItemCount: 0,
      usedItemCount: 0,
      sellerCount: 0,
      reason,
    },
  };
}

async function searchByIsbn(isbn: string): Promise<{
  totalDocs: number;
  docs: SearchDoc[];
} | null> {
  const url = `${SEARCH}?${new URLSearchParams({ q: isbn, sort: "hinta", page: "1" })}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "BookOps/0.1" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { totalDocs?: number; docs?: SearchDoc[] };
  };
  return {
    totalDocs: json.data?.totalDocs ?? 0,
    docs: json.data?.docs ?? [],
  };
}

async function fetchTeos(path: string): Promise<{
  catalog: CatalogPayload;
  offer: SelectedOffer | null;
  url: string;
} | null> {
  const url = path.startsWith("http") ? path : `https://www.antikvaari.fi${path}`;
  const res = await fetch(url, { headers: { "User-Agent": "BookOps/0.1" } });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/,
  );
  if (!match) return null;
  const data = JSON.parse(match[1]) as {
    props?: {
      pageProps?: {
        catalog?: CatalogPayload;
        preSelectedProduct?: SelectedOffer;
      };
    };
  };
  const catalog = data.props?.pageProps?.catalog;
  if (!catalog) return null;
  return {
    catalog,
    offer: data.props?.pageProps?.preSelectedProduct ?? null,
    url,
  };
}

function hitFromCatalog(
  page: { catalog: CatalogPayload; offer: SelectedOffer | null; url: string },
  doc: SearchDoc,
  searchedAt: string,
  exactIsbn: boolean,
): AntikvaariHit {
  const lowest = numberOrNull(page.catalog.min_price) ?? numberOrNull(doc.priceFrom);
  const newItems = page.catalog.new_items ?? 0;
  const usedItems = page.catalog.used_items ?? doc.availableCount ?? 0;
  const supply = newItems + usedItems;
  const sellerCount = doc.vendorCount ?? 0;
  const inPrint = newItems > 0;
  const offer = page.offer;
  const condition = parseCondition(offer?.kunto);
  const listings: MarketListing[] = [];
  if (offer?.ynimi && offer.hinta != null && condition) {
    listings.push({
      seller: offer.ynimi,
      price: offer.hinta,
      condition,
    });
  }

  const priced = suggest(lowest, supply, inPrint);
  const reason = exactIsbn
    ? priced.reason
    : `${priced.reason} Katalogissa ei ollut samaa ISBN:ää, osuma on haun ainoa tulos.`;

  const image = page.catalog.catalog_img?.url ?? null;
  const coverUrl = image && !image.includes("no-image") ? image : null;
  const description =
    page.catalog.enrichment?.description?.trim() ||
    page.catalog.description?.trim() ||
    null;

  return {
    title: page.catalog.title || page.catalog.short_title || null,
    author: page.catalog.authors?.[0]?.name ?? null,
    description,
    coverUrl,
    inPrint,
    market: {
      listingCount: supply,
      lowestPrice: lowest,
      highestPrice: null,
      listings,
      searchedAt,
      catalogUrl: page.url,
      newItemCount: newItems,
      usedItemCount: usedItems,
      sellerCount,
      reason,
    },
  };
}

function suggest(
  lowest: number | null,
  supply: number,
  inPrint: boolean,
): { reason: string } {
  if (lowest == null) {
    return {
      reason: "Antikvaari-sivu löytyi, mutta alin hinta puuttui. Aseta hinta käsin.",
    };
  }
  const scarce = supply > 0 && supply <= 2;
  let factor = 1;
  if (inPrint) factor *= 0.95;
  else if (scarce) factor *= 1.15;
  else if (supply >= 8) factor *= 0.9;
  const recommended = roundEuro(lowest * factor);
  const printText = inPrint
    ? "Myynnissä on myös uusia kappaleita, joten ehdotus on hieman alimman alle."
    : scarce
      ? "Uusia kappaleita ei ole ja tarjonta on niukka, joten ehdotus on alinta korkeampi."
      : "Vain käytettyjä kappaleita.";
  return {
    reason: `Antikvaarissa ${supply} kpl, alin ${formatPlain(lowest)} €. ${printText} Ehdotus ${formatPlain(recommended)} €.`,
  };
}

export function recommendedPrice(market: MarketSnapshot, inPrint: boolean | null): {
  min: number | null;
  max: number | null;
  recommended: number | null;
} {
  if (market.lowestPrice == null) {
    return { min: null, max: null, recommended: null };
  }
  const supply = market.listingCount;
  const printed = inPrint === true;
  const scarce = supply > 0 && supply <= 2;
  let factor = 1;
  if (printed) factor *= 0.95;
  else if (inPrint === false && scarce) factor *= 1.15;
  else if (inPrint === false && supply >= 8) factor *= 0.9;
  const recommended = roundEuro(market.lowestPrice * factor);
  return {
    min: roundEuro(recommended * 0.9),
    max: roundEuro(recommended * 1.15),
    recommended,
  };
}

function parseCondition(value: string | undefined): ConditionGrade | null {
  if (!value) return null;
  const match = value.toUpperCase().match(/K[1-5]/);
  return (match?.[0] as ConditionGrade | undefined) ?? null;
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundEuro(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatPlain(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
