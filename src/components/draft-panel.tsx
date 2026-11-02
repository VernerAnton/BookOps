"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Book, BookStatus, Condition } from "@/lib/types";
import { CONDITIONS } from "@/lib/types";
import { euro } from "@/lib/format";

const statusLabel: Record<BookStatus, string> = {
  enriching: "Reading",
  needs_photo: "Needs photo",
  ready: "Ready",
  live: "Listed",
};

const steps = [
  { key: "scan", label: "Scan", caption: "One ISBN, one listing." },
  { key: "market", label: "Market", caption: "Asks and how many copies." },
  { key: "print", label: "Print", caption: "Scarcity only if it is out of print." },
  { key: "copy", label: "Copy", caption: "Title, blurb, and cover." },
  { key: "photo", label: "Photo", caption: "Front and back if something is missing." },
  { key: "accept", label: "Accept", caption: "That snapshot goes out." },
] as const;

function stepState(book: Book, key: (typeof steps)[number]["key"]): "done" | "now" | "wait" {
  const enriching = book.status === "enriching";
  const hasMarket = !enriching && book.market !== null;
  const hasCopy = Boolean(book.coverUrl && book.description.trim());
  if (key === "scan") return "done";
  if (key === "market") return enriching ? "now" : hasMarket ? "done" : "wait";
  if (key === "print") return hasMarket ? "done" : enriching ? "wait" : "now";
  if (key === "copy") return hasCopy ? "done" : enriching ? "wait" : "now";
  if (key === "photo") return hasCopy ? "done" : "now";
  if (book.status === "live") return "done";
  if (book.status === "ready") return "now";
  return "wait";
}

export function DraftPanel({
  book,
  acceptError,
  readingBack,
  onPatch,
  onAccept,
  onFront,
  onBack,
}: {
  book: Book | undefined;
  acceptError: string | null;
  readingBack: boolean;
  onPatch: (patch: Partial<Book>) => void;
  onAccept: () => void;
  onFront: (file: File) => void;
  onBack: (file: File) => void;
}) {
  const scrollerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo(0, 0);
  }, [book?.id]);

  if (!book) {
    return (
      <section className="flex flex-1 items-center justify-center bg-bg p-8">
        <p className="max-w-sm text-center font-cond text-3xl leading-none font-semibold">
          Select a listing, or scan the next ISBN.
        </p>
      </section>
    );
  }

  const locked = book.status === "live" || book.status === "enriching";
  const missingCopy = !book.coverUrl || !book.description.trim();

  return (
    <section ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto bg-bg">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-line px-4 py-4 md:px-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">How this one moves</p>
          <h2 className="mt-1 max-w-3xl font-display text-5xl leading-none tracking-tight md:text-6xl">
            {book.title}
          </h2>
          <p className="mt-2 font-cond text-xl">
            {book.author} · <span className="font-mono text-base">{book.isbn}</span>
          </p>
        </div>
        <StatusMark status={book.status} />
      </div>

      <ol className="grid grid-cols-3 border-b-2 border-line sm:grid-cols-6">
        {steps.map((step) => {
          const state = stepState(book, step.key);
          return (
            <li
              key={step.key}
              className={`border-r border-line px-3 py-2 last:border-r-0 ${
                state === "now" ? "bg-signal text-on-signal" : "bg-panel"
              } ${state === "wait" ? "text-muted" : ""}`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em]">
                {state === "done" ? "Done" : state === "now" ? "Now" : "Wait"}
              </p>
              <p className="font-cond text-xl leading-none font-semibold">{step.label}</p>
            </li>
          );
        })}
      </ol>
      <p className="border-b-2 border-line px-4 py-2 font-cond text-lg md:px-6">
        {steps.find((step) => stepState(book, step.key) === "now")?.caption ??
          "This snapshot is listed. The price stays put."}
      </p>

      {book.status === "enriching" ? (
        <p className="blink border-b-2 border-line bg-signal px-4 py-4 font-display text-4xl tracking-tight text-on-signal md:px-6">
          Reading this ISBN
        </p>
      ) : null}

      <div className="grid border-b-2 border-line lg:grid-cols-[200px_1fr]">
        <div className="border-b-2 border-line px-4 py-4 md:px-6 lg:border-r-2 lg:border-b-0">
          <CoverBlock
            book={book}
            locked={locked}
            readingBack={readingBack}
            onFront={onFront}
            onBack={onBack}
          />
          {missingCopy && book.status !== "enriching" ? (
            <p className="text-base leading-snug">
              <Link href={`/mobile/task/${book.id}`} className="underline decoration-2 underline-offset-4">
                Open the shop-floor task
              </Link>
            </p>
          ) : null}
        </div>
        <MarketBlock book={book} locked={locked} onPatch={onPatch} />
      </div>

      <div className="grid gap-5 border-t-2 border-line px-4 py-5 md:px-6">
        <div>
          <FieldLabel>Condition · K1 best, K5 worn</FieldLabel>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {CONDITIONS.map((grade) => {
              const selected = book.condition === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  disabled={locked}
                  aria-pressed={selected}
                  onClick={() => onPatch({ condition: grade satisfies Condition })}
                  className={`border-2 border-line py-3 font-display text-3xl ${
                    selected ? "bg-signal text-on-signal" : "bg-panel text-ink"
                  } disabled:opacity-60`}
                >
                  {grade}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <FieldLabel>Quantity</FieldLabel>
            <input
              type="number"
              min={1}
              value={book.quantity}
              disabled={locked}
              onChange={(event) => onPatch({ quantity: Math.max(1, Number(event.target.value) || 1) })}
              className="border-2 border-line bg-input px-3 py-2 font-mono text-xl text-ink"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Stays in BookOps</p>
          </label>
          <label className="grid gap-1">
            <FieldLabel>Shelf or storage</FieldLabel>
            <input
              value={book.location}
              disabled={locked}
              placeholder="Shelf A-14, storage, a staff note"
              onChange={(event) => onPatch({ location: event.target.value })}
              className="border-2 border-line bg-input px-3 py-2 font-cond text-xl text-ink placeholder:text-muted"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Stays in BookOps</p>
          </label>
        </div>
      </div>

      <div className="grid gap-4 border-t-2 border-line px-4 py-5 md:px-6">
        <div className="grid content-start gap-4">
          <Field label="Title" value={book.title} disabled={locked} onChange={(title) => onPatch({ title })} />
          <Field label="Author" value={book.author} disabled={locked} onChange={(author) => onPatch({ author })} />
          <label className="grid gap-1">
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={book.description}
              disabled={locked}
              rows={4}
              onChange={(event) =>
                onPatch({
                  description: event.target.value,
                  blurbSource: book.blurbSource ?? "Edited on the desk",
                })
              }
              className="resize-y border-2 border-line bg-input px-3 py-2 font-serif text-lg leading-snug text-ink"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              {book.blurbSource ?? "No blurb yet"}
            </p>
          </label>
        </div>
      </div>

      <div className="border-t-2 border-line bg-panel px-4 py-4 md:px-6">
        {book.listingNote ? (
          <p className="mb-3 border-2 border-live px-3 py-2 font-cond text-lg">{book.listingNote}</p>
        ) : null}
        {acceptError ? (
          <p className="mb-3 border-2 border-hot bg-hot px-3 py-2 font-cond text-lg text-white">{acceptError}</p>
        ) : null}
        {missingCopy && book.status !== "live" && book.status !== "enriching" ? (
          <p className="mb-3 font-cond text-lg">
            The cover or the blurb is still missing. Photograph both on this desk, or{" "}
            <Link href={`/mobile/task/${book.id}`} className="underline decoration-2 underline-offset-4">
              open the shop-floor task
            </Link>
            .
          </p>
        ) : null}
        <button
          type="button"
          onClick={onAccept}
          disabled={book.status !== "ready"}
          className="w-full border-2 border-line bg-signal px-4 py-4 font-display text-4xl tracking-tight text-on-signal disabled:bg-panel-2 disabled:text-muted"
        >
          {book.status === "live"
            ? "Snapshot sent"
            : book.status === "needs_photo"
              ? "Photo first"
              : book.status === "enriching"
                ? "Still reading"
                : "Accept snapshot"}
        </button>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Accept locks this text, this price, and this photo. This mock does not contact Antikvaari.
        </p>
      </div>
    </section>
  );
}

function StatusMark({ status }: { status: BookStatus }) {
  const tone =
    status === "needs_photo"
      ? "bg-hot text-white"
      : status === "live"
        ? "bg-live text-on-live"
        : status === "enriching"
          ? "bg-signal text-on-signal blink"
          : "bg-signal text-on-signal";
  return (
    <p className={`px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] ${tone}`}>{statusLabel[status]}</p>
  );
}

function MarketBlock({
  book,
  locked,
  onPatch,
}: {
  book: Book;
  locked: boolean;
  onPatch: (patch: Partial<Book>) => void;
}) {
  const market = book.market;
  const suggestion = book.suggestion;
  return (
    <div className="relative grid gap-4 bg-panel-2 px-4 py-5 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="flex items-start justify-between gap-4">
          <FieldLabel>Market note</FieldLabel>
          <span className="sample-stamp px-2 py-1 text-sm">Sample</span>
        </div>
        {market ? (
          <div className="mt-3 grid gap-2">
            <p className="font-cond text-3xl leading-none font-semibold">
              {market.copies} cop{market.copies === 1 ? "y" : "ies"}
              {market.lowest !== null ? ` from ${euro(market.lowest)}` : ""}
            </p>
            <p className="text-lg">{market.conditionSpread}</p>
            <p className="text-lg">{market.printNote}</p>
          </div>
        ) : (
          <p className="mt-3 text-lg">Market not read yet.</p>
        )}
      </div>
      <div className="border-2 border-line bg-panel p-3">
        <FieldLabel>Suggested price</FieldLabel>
        {suggestion ? (
          <>
            <p className="mt-2 font-mono text-2xl">
              {euro(suggestion.low)} – {euro(suggestion.high)}
            </p>
            <button
              type="button"
              disabled={locked}
              onClick={() => onPatch({ price: suggestion.recommend.toFixed(2) })}
              className="mt-3 border-2 border-line bg-signal px-3 py-2 font-cond text-xl font-semibold text-on-signal disabled:opacity-50"
            >
              Use {euro(suggestion.recommend)}
            </button>
            <p className="mt-3 text-base leading-snug">{suggestion.reason}</p>
          </>
        ) : (
          <p className="mt-2 text-lg">No suggestion. Set the price yourself. Scarcity is not assumed.</p>
        )}
        <label className="mt-4 grid gap-1">
          <FieldLabel>Final price</FieldLabel>
          <span className="flex border-2 border-line bg-input">
            <span className="grid place-items-center px-3 font-mono text-xl">€</span>
            <input
              value={book.price}
              disabled={locked}
              inputMode="decimal"
              onChange={(event) => onPatch({ price: event.target.value })}
              className="w-full bg-transparent py-2 pr-3 font-mono text-2xl text-ink outline-none"
            />
          </span>
        </label>
      </div>
    </div>
  );
}

function CoverBlock({
  book,
  locked,
  readingBack,
  onFront,
  onBack,
}: {
  book: Book;
  locked: boolean;
  readingBack: boolean;
  onFront: (file: File) => void;
  onBack: (file: File) => void;
}) {
  return (
    <div className="grid content-start gap-3">
      <CoverImage url={book.coverUrl} alt={`${book.title} cover`} />
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {book.coverSource ? `Cover · ${book.coverSource}` : "No cover"}
      </p>
      {book.backCoverUrl ? (
        <CoverImage url={book.backCoverUrl} alt={`${book.title} back cover`} />
      ) : null}
      {readingBack ? <p className="blink font-cond text-xl font-semibold">Reading the back cover</p> : null}
      {locked ? null : (
        <div className="grid gap-2">
          <PhotoButton label={book.coverUrl ? "Replace cover" : "Photograph the front"} onFile={onFront} />
          <PhotoButton label={book.backCoverUrl ? "Replace back cover" : "Photograph the back"} onFile={onBack} />
          <p className="text-sm leading-snug text-muted">
            A shop photo overrides a database cover. The back photo is where the blurb is read from.
          </p>
        </div>
      )}
    </div>
  );
}

function CoverImage({ url, alt }: { url: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="grid aspect-[2/3] place-items-center border-2 border-dashed border-hot bg-panel text-center">
        <p className="px-3 font-display text-3xl leading-none text-hot">No cover</p>
      </div>
    );
  }
  return (
    // Covers are remote sample images or shop photos. A plain img keeps both without a loader config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className="aspect-[2/3] w-full border-2 border-line object-cover"
    />
  );
}

function PhotoButton({ label, onFile }: { label: string; onFile: (file: File) => void }) {
  return (
    <label className="cursor-pointer border-2 border-line bg-panel px-3 py-3 text-center font-cond text-lg font-semibold">
      {label}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="border-2 border-line bg-input px-3 py-2 font-cond text-2xl text-ink"
      />
    </label>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{children}</span>;
}
