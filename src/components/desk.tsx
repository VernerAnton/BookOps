"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { BookRecord, UpdateBookInput } from "@/lib/types";
import { isIsbn, normalizeIsbn, parsePrice, priceText } from "@/lib/format";
import { fileToJpegDataUrl } from "@/lib/images";
import { isLocked } from "@/lib/listing";
import {
  acceptBook,
  addBook,
  ApiError,
  fetchBooks,
  patchBook,
  rerunLookup,
  sendPhotos,
} from "@/lib/books-client";
import { DraftPanel, type Draft, type DraftPatch } from "@/components/draft-panel";
import { QueueList } from "@/components/queue-list";
import { ThemeToggle } from "@/components/theme-toggle";

const SELECTED_KEY = "bookops-selected";
const SAVE_DELAY_MS = 600;
const REFRESH_MS = 8000;

type Edits = { id: string; patch: DraftPatch; version: number };

function storedSelection(): string | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

function toInput(patch: DraftPatch): UpdateBookInput {
  const input: UpdateBookInput = {};
  if (patch.title !== undefined) input.title = patch.title ?? "";
  if (patch.author !== undefined) input.author = patch.author ?? "";
  if (patch.description !== undefined) input.description = patch.description ?? "";
  if (patch.condition) input.condition = patch.condition;
  if (patch.internalQty !== undefined) input.internalQty = patch.internalQty;
  if (patch.internalLocation !== undefined) input.internalLocation = patch.internalLocation ?? "";
  if (patch.internalNotes !== undefined) input.internalNotes = patch.internalNotes ?? "";
  if (patch.priceText !== undefined) input.price = parsePrice(patch.priceText);
  return input;
}

function placeholder(id: string, isbn: string): BookRecord {
  const now = new Date().toISOString();
  return {
    id,
    isbn,
    status: "enriching",
    title: null,
    author: null,
    description: null,
    suggestedPriceMin: null,
    suggestedPriceMax: null,
    price: null,
    condition: null,
    internalQty: 1,
    internalLocation: null,
    internalNotes: null,
    coverUrl: null,
    coverSource: null,
    backCoverUrl: null,
    inPrint: null,
    market: null,
    antikvaariListingId: null,
    antikvaariListingUrl: null,
    mobileTaskToken: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function Desk({ initialBookId }: { initialBookId?: string }) {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [pending, setPending] = useState<BookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => initialBookId ?? storedSelection());
  const [edits, setEdits] = useState<Edits | null>(null);
  const [typedPrice, setTypedPrice] = useState<{ id: string; text: string } | null>(null);
  const [isbn, setIsbn] = useState("");
  const [bayError, setBayError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const editsRef = useRef<Edits | null>(null);
  const version = useRef(0);
  const timer = useRef<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const mergeBook = useCallback((book: BookRecord | null) => {
    if (!book) return;
    setBooks((current) =>
      current.some((item) => item.id === book.id)
        ? current.map((item) => (item.id === book.id ? book : item))
        : [book, ...current],
    );
  }, []);

  const refresh = useCallback(async () => {
    try {
      setBooks(await fetchBooks());
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load the queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [refresh]);

  // A placeholder row stands in for a scan until the server has the record.
  const visiblePending = pending.filter(
    (row) => !books.some((book) => book.isbn === row.isbn && book.createdAt >= row.createdAt),
  );
  const queue = [...visiblePending, ...books];
  const server = queue.find((book) => book.id === selectedId) ?? queue[0];

  let draft: Draft | undefined;
  if (server) {
    const local = edits?.id === server.id ? edits.patch : {};
    const typed = typedPrice?.id === server.id ? typedPrice.text : null;
    draft = {
      ...server,
      ...local,
      priceText:
        local.priceText ??
        (typed !== null && parsePrice(typed) === server.price ? typed : priceText(server.price)),
    };
  }

  // The queue row for the open draft shows what is being typed.
  const listed = queue.map((book) =>
    draft && book.id === draft.id ? { ...draft, price: parsePrice(draft.priceText) } : book,
  );

  async function save() {
    timer.current = null;
    if (inflight.current) await inflight.current;
    const snapshot = editsRef.current;
    if (!snapshot) return;
    const run = (async () => {
      try {
        mergeBook(await patchBook(snapshot.id, toInput(snapshot.patch)));
        setProblem(null);
        if (editsRef.current?.version === snapshot.version) {
          editsRef.current = null;
          setEdits(null);
        }
      } catch (error) {
        if (error instanceof ApiError) mergeBook(error.book);
        setProblem(error instanceof Error ? error.message : "Could not save the draft.");
        if (error instanceof ApiError && error.book && isLocked(error.book.status)) {
          editsRef.current = null;
          setEdits(null);
        }
      }
    })();
    inflight.current = run;
    await run;
    if (inflight.current === run) inflight.current = null;
  }

  async function flush() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      await save();
    } else if (inflight.current) {
      await inflight.current;
    }
  }

  function select(id: string) {
    void flush();
    setSelectedId(id);
    setProblem(null);
    setNotice(null);
    try {
      window.sessionStorage.setItem(SELECTED_KEY, id);
    } catch {
      // Selection is a convenience. Nothing else depends on it.
    }
  }

  function patchDraft(patch: DraftPatch) {
    if (!draft || isLocked(draft.status) || draft.id.startsWith("pending-")) return;
    const id = draft.id;
    const previous = editsRef.current?.id === id ? editsRef.current.patch : {};
    version.current += 1;
    const next: Edits = { id, patch: { ...previous, ...patch }, version: version.current };
    editsRef.current = next;
    setEdits(next);
    if (patch.priceText !== undefined) setTypedPrice({ id, text: patch.priceText });
    setProblem(null);
    setNotice(null);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
  }

  async function addIsbn(event: FormEvent) {
    event.preventDefault();
    const code = normalizeIsbn(isbn);
    if (!isIsbn(code)) {
      setBayError("Need a 10- or 13-digit ISBN.");
      return;
    }
    const tempId = `pending-${Date.now()}`;
    setPending((current) => [placeholder(tempId, code), ...current]);
    select(tempId);
    setIsbn("");
    setBayError(null);
    try {
      const book = await addBook(code);
      mergeBook(book);
      if (book) setSelectedId((current) => (current === tempId ? book.id : current));
    } catch (error) {
      setBayError(error instanceof Error ? error.message : "Could not add that ISBN.");
    } finally {
      setPending((current) => current.filter((row) => row.id !== tempId));
    }
  }

  async function addPhoto(file: File, side: "front" | "back") {
    if (!draft || isLocked(draft.status)) return;
    const id = draft.id;
    setSavingPhoto(true);
    setProblem(null);
    try {
      await flush();
      const dataUrl = await fileToJpegDataUrl(file);
      const book = await sendPhotos(id, side === "front" ? { coverDataUrl: dataUrl } : { backDataUrl: dataUrl });
      mergeBook(book);
      setNotice(side === "front" ? "Cover saved." : "Back cover saved. Type its blurb into Description.");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not save the photo.");
    } finally {
      setSavingPhoto(false);
    }
  }

  async function retry() {
    if (!draft) return;
    const book = draft;
    mergeBook({ ...book, status: "enriching" });
    setProblem(null);
    try {
      mergeBook(await rerunLookup(book.id));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The lookup failed.");
      await refresh();
    }
  }

  async function accept() {
    if (!draft || draft.status !== "ready_for_review") return;
    if (!draft.condition) {
      setProblem("Condition is still open. Pick K1–K5.");
      return;
    }
    if (parsePrice(draft.priceText) === null) {
      setProblem("Set a final price before Accept.");
      return;
    }
    if (!draft.title?.trim()) {
      setProblem("The listing needs a title.");
      return;
    }
    const id = draft.id;
    setAccepting(true);
    setProblem(null);
    try {
      await flush();
      const result = await acceptBook(id);
      mergeBook(result.book);
      setNotice(null);
    } catch (error) {
      if (error instanceof ApiError) mergeBook(error.book);
      setProblem(error instanceof Error ? error.message : "Accept failed.");
    } finally {
      setAccepting(false);
    }
  }

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
              Scan an ISBN. Check the draft. Accept locks that snapshot.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <form
          onSubmit={addIsbn}
          className="grid gap-2 border-t-2 border-line px-4 py-3 md:grid-cols-[auto_1fr_auto] md:items-center md:px-6"
        >
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
          <button
            type="submit"
            className="border-2 border-line bg-signal px-4 py-2 font-display text-2xl tracking-tight text-on-signal"
          >
            Add to queue
          </button>
          <p
            className={`font-mono text-[11px] leading-relaxed tracking-[0.08em] uppercase md:col-start-2 ${
              bayError || loadError ? "text-hot" : "text-muted"
            }`}
          >
            {bayError ??
              loadError ??
              "USB scanner: focus this field. Enter submits. The same ISBN can be another copy."}
          </p>
        </form>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <QueueList books={listed} selectedId={draft?.id ?? null} loading={loading} onSelect={select} />
        <DraftPanel
          book={draft}
          acceptError={problem}
          notice={notice}
          readingBack={savingPhoto}
          accepting={accepting}
          onPatch={patchDraft}
          onAccept={() => void accept()}
          onRetry={() => void retry()}
          onFront={(file) => void addPhoto(file, "front")}
          onBack={(file) => void addPhoto(file, "back")}
        />
      </div>
    </div>
  );
}
