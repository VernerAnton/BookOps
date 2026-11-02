"use client";

import { useCallback, useEffect, useState } from "react";
import type { Book } from "@/lib/types";
import { createSeed } from "@/lib/seed";
import { completeEnrichment } from "@/lib/resolve";

const STORAGE_KEY = "bookops-mock-v1";
const EVENT_NAME = "bookops-queue";
const timers = new Map<string, number>();

function load(): Book[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw) as Book[];
    if (!Array.isArray(parsed)) return createSeed();
    return parsed;
  } catch {
    return createSeed();
  }
}

export function patchQueue(update: (books: Book[]) => Book[]): Book[] {
  const next = update(load());
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT_NAME));
  return next;
}

export function resetQueue(): Book[] {
  window.localStorage.removeItem(STORAGE_KEY);
  timers.forEach((timer) => window.clearTimeout(timer));
  timers.clear();
  const next = createSeed();
  window.dispatchEvent(new Event(EVENT_NAME));
  return next;
}

export function enqueueEnrichment(id: string): void {
  if (timers.has(id)) return;
  const timer = window.setTimeout(() => {
    timers.delete(id);
    patchQueue((books) =>
      books.map((book) =>
        book.id === id && book.status === "enriching" ? completeEnrichment(book) : book,
      ),
    );
  }, 700);
  timers.set(id, timer);
}

export function useQueue(): [Book[], (update: (books: Book[]) => Book[]) => void, () => void] {
  const [books, setBooks] = useState<Book[]>(createSeed);

  useEffect(() => {
    const sync = () => setBooks(load());
    sync();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((change: (current: Book[]) => Book[]) => {
    setBooks(patchQueue(change));
  }, []);

  const reset = useCallback(() => {
    setBooks(resetQueue());
  }, []);

  return [books, update, reset];
}
