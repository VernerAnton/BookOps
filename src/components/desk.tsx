"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Book } from "@/lib/types";
import { isIsbn, normalizeIsbn, parsePrice } from "@/lib/format";
import { fileToJpegDataUrl } from "@/lib/images";
import { enqueueEnrichment, useQueue } from "@/lib/queue-store";
import { applyBookPatch, backCoverPatch } from "@/lib/resolve";
import { DraftPanel } from "@/components/draft-panel";
import { QueueList } from "@/components/queue-list";
import { ThemeToggle } from "@/components/theme-toggle";

const SELECTED_KEY = "bookops-selected";

export function Desk() {
  const [books, update, reset] = useQueue();
  const [selectedId, setSelectedId] = useState("sample-1984");
  const [isbn, setIsbn] = useState("");
  const [bayError, setBayError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [readingBack, setReadingBack] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(SELECTED_KEY);
    if (stored) setSelectedId(stored);
  }, []);

  useEffect(() => {
    for (const book of books) {
      if (book.status === "enriching") enqueueEnrichment(book.id);
    }
  }, [books]);

  useEffect(() => {
    if (!books.some((book) => book.id === selectedId) && books[0]) {
      setSelectedId(books[0].id);
    }
  }, [books, selectedId]);

  function select(id: string) {
    setSelectedId(id);
    setAcceptError(null);
    window.sessionStorage.setItem(SELECTED_KEY, id);
  }

  function addIsbn(event: FormEvent) {
    event.preventDefault();
    const code = normalizeIsbn(isbn);
    if (!isIsbn(code)) {
      setBayError("Need a 10- or 13-digit ISBN.");
      return;
    }
    const book: Book = {
      id: `scan-${Date.now()}`,
      isbn: code,
      title: "Reading ISBN",
      author: "Looking it up",
      description: "",
      coverUrl: null,
      coverSource: null,
      backCoverUrl: null,
      blurbSource: null,
      condition: null,
      quantity: 1,
      location: "",
      price: "",
      market: null,
      suggestion: null,
      status: "enriching",
      listingNote: null,
      scannedAt: new Date().toISOString(),
    };
    update((current) => [book, ...current]);
    enqueueEnrichment(book.id);
    select(book.id);
    setIsbn("");
    setBayError(null);
  }

  function patchSelected(patch: Partial<Book>) {
    setAcceptError(null);
    update((current) =>
      current.map((book) => (book.id === selectedId ? applyBookPatch(book, patch) : book)),
    );
  }

  async function addFront(file: File) {
    const coverUrl = await fileToJpegDataUrl(file);
    patchSelected({ coverUrl, coverSource: "Shop photo" });
  }

  async function addBack(file: File) {
    setReadingBack(true);
    try {
      const dataUrl = await fileToJpegDataUrl(file);
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      update((current) =>
        current.map((book) =>
          book.id === selectedId ? applyBookPatch(book, backCoverPatch(book, dataUrl)) : book,
        ),
      );
    } finally {
      setReadingBack(false);
    }
  }

  function accept() {
    const book = books.find((item) => item.id === selectedId);
    if (!book || book.status !== "ready") return;
    if (!book.condition) {
      setAcceptError("Condition is still open. Pick K1–K5.");
      return;
    }
    if (parsePrice(book.price) === null) {
      setAcceptError("Set a final price before Accept.");
      return;
    }
    if (!book.coverUrl || !book.description.trim()) {
      setAcceptError("A cover and a blurb have to be in the snapshot.");
      return;
    }
    update((current) =>
      current.map((item) =>
        item.id === book.id
          ? {
              ...item,
              status: "live",
              listingNote:
                "Marked listed in this mock. Antikvaari was not contacted. The price and the photo stay as they were at Accept.",
            }
          : item,
      ),
    );
    setAcceptError(null);
  }

  const selected = books.find((book) => book.id === selectedId);

  return (
    <div className="flex h-dvh flex-col">
      <div className="h-2 hazard" />
      <header className="border-b-2 border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div>
            <p className="font-display text-5xl leading-none tracking-tight">
              BOOK<span className="ml-1 inline-block bg-signal px-1.5 text-on-signal">OPS</span>
            </p>
            <p className="mt-1 max-w-xl font-cond text-lg leading-tight">
              Scan an ISBN. Check the draft. Accept sends that snapshot.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                reset();
                select("sample-1984");
              }}
              className="border-2 border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]"
            >
              Reset sample
            </button>
            <ThemeToggle />
          </div>
        </div>
        <form onSubmit={addIsbn} className="grid gap-2 border-t-2 border-line px-4 py-3 md:grid-cols-[auto_1fr_auto] md:items-center md:px-6">
          <label htmlFor="isbn-bay" className="font-mono text-[11px] uppercase tracking-[0.18em]">
            Scan bay
          </label>
          <input
            id="isbn-bay"
            value={isbn}
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            placeholder="9780141036144"
            onChange={(event) => {
              setIsbn(event.target.value);
              setBayError(null);
            }}
            className="border-2 border-line bg-input px-3 py-2 font-mono text-2xl text-ink placeholder:text-muted"
          />
          <button type="submit" className="border-2 border-line bg-signal px-4 py-2 font-display text-2xl tracking-tight text-on-signal">
            Add to queue
          </button>
          <p className="font-mono text-[11px] leading-relaxed tracking-[0.08em] text-muted uppercase md:col-start-2">
            {bayError ?? "USB scanner: focus this field. Enter submits. The same ISBN can be another copy."}
          </p>
        </form>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <QueueList books={books} selectedId={selected?.id ?? null} onSelect={select} />
        <DraftPanel
          book={selected}
          acceptError={acceptError}
          readingBack={readingBack}
          onPatch={patchSelected}
          onAccept={accept}
          onFront={(file) => {
            void addFront(file);
          }}
          onBack={(file) => {
            void addBack(file);
          }}
        />
      </div>
    </div>
  );
}
