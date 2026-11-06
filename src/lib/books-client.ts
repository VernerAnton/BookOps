import type { BookRecord, UpdateBookInput } from "./types";

type BookResponse = { book: BookRecord | null; error?: unknown; message?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public book: BookRecord | null,
  ) {
    super(message);
  }
}

function errorText(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  return fallback;
}

async function send(url: string, init: RequestInit, fallback: string): Promise<BookResponse> {
  const res = await fetch(url, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Partial<BookResponse>;
  if (!res.ok) throw new ApiError(errorText(data.error, fallback), data.book ?? null);
  return { book: data.book ?? null, message: data.message };
}

export async function fetchBooks(): Promise<BookRecord[]> {
  const res = await fetch("/api/books", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load the queue.");
  const data = (await res.json()) as { books?: BookRecord[] };
  return data.books ?? [];
}

export async function fetchBook(id: string): Promise<BookRecord | null> {
  const res = await fetch(`/api/books/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not load this listing.");
  const data = (await res.json()) as { book?: BookRecord };
  return data.book ?? null;
}

export async function addBook(isbn: string): Promise<BookRecord | null> {
  const data = await send(
    "/api/books",
    { method: "POST", body: JSON.stringify({ isbn, autoEnrich: true }) },
    "Could not add that ISBN.",
  );
  return data.book;
}

export async function patchBook(id: string, patch: UpdateBookInput): Promise<BookRecord | null> {
  const data = await send(
    `/api/books/${id}`,
    { method: "PATCH", body: JSON.stringify(patch) },
    "Could not save the draft.",
  );
  return data.book;
}

export async function sendPhotos(
  id: string,
  photos: { coverDataUrl?: string; backDataUrl?: string },
): Promise<BookRecord | null> {
  const data = await send(
    `/api/books/${id}/photos`,
    { method: "POST", body: JSON.stringify(photos) },
    "Could not save the photo.",
  );
  return data.book;
}

export async function rerunLookup(id: string): Promise<BookRecord | null> {
  const data = await send(`/api/books/${id}/enrich`, { method: "POST" }, "The lookup failed.");
  return data.book;
}

export async function acceptBook(id: string): Promise<{ book: BookRecord | null; message?: string }> {
  return send(`/api/books/${id}/publish`, { method: "POST" }, "Accept failed.");
}
