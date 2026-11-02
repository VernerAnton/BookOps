const euroFormat = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
});

const timeFormat = new Intl.DateTimeFormat("fi-FI", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Helsinki",
});

export function euro(value: number): string {
  return euroFormat.format(value);
}

export function scannedLabel(value: string): string {
  if (value === "sample") return "Sample";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Queued";
  return timeFormat.format(date);
}

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isIsbn(isbn: string): boolean {
  return /^\d{13}$/.test(isbn) || /^\d{9}[\dX]$/.test(isbn);
}

export function parsePrice(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}
