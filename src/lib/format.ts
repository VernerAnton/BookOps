export { normalizeIsbn } from "./antikvaari";

const euroFormat = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
});

const timeFormat = new Intl.DateTimeFormat("fi-FI", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Helsinki",
});

const dayFormat = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  timeZone: "Europe/Helsinki",
});

export function euro(value: number): string {
  return euroFormat.format(value);
}

/** Time for today, day and month for anything older. */
export function scannedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Queued";
  const sameDay = dayFormat.format(date) === dayFormat.format(new Date());
  return sameDay ? timeFormat.format(date) : dayFormat.format(date);
}

export function isIsbn(isbn: string): boolean {
  return /^\d{13}$/.test(isbn) || /^\d{9}[\dX]$/.test(isbn);
}

export function parsePrice(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

export function priceText(value: number | null): string {
  return value == null ? "" : value.toFixed(2);
}

const coverSources: Record<string, string> = {
  antikvaari: "Antikvaari catalog",
  openlibrary: "Open Library",
  "shop-photo": "Shop photo",
  "mobile-camera": "Shop photo",
};

export function coverSourceLabel(source: string | null): string | null {
  if (!source) return null;
  return coverSources[source] ?? source;
}
