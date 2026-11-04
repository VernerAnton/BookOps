import { randomUUID } from "crypto";

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
