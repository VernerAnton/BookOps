"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BookRecord, ConditionGrade } from "@/lib/types";
import { recommendedPrice } from "@/lib/antikvaari";
import { coverSourceLabel, euro, scannedLabel } from "@/lib/format";
import { hasListingCopy, isAccepted, isLocked, isReading, MIN_BLURB } from "@/lib/listing";
import { StatusMark } from "@/components/status";

const CONDITIONS: ConditionGrade[] = ["K1", "K2", "K3", "K4", "K5"];

/** A book as the desk edits it. The price is kept as typed. */
export type Draft = BookRecord & { priceText: string };

export type DraftPatch = Partial<
  Pick<
    Draft,
    | "title"
    | "author"
    | "description"
    | "priceText"
    | "condition"
    | "internalQty"
    | "internalLocation"
    | "internalNotes"
  >
>;

const steps = [
  { key: "scan", label: "Scan", caption: "One ISBN, one listing." },
  { key: "market", label: "Market", caption: "Reading Antikvaari asks and how many copies." },
  { key: "print", label: "Print", caption: "Scarcity only counts if it is out of print." },
  { key: "copy", label: "Copy", caption: "Title, blurb, and cover." },
  { key: "photo", label: "Photo", caption: "Front and back if something is missing." },
  { key: "accept", label: "Accept", caption: "Check condition and price, then accept this snapshot." },
] as const;

function stepState(book: BookRecord, key: (typeof steps)[number]["key"]): "done" | "now" | "wait" {
  const reading = isReading(book.status);
  const hasMarket = !reading && book.market !== null;
  const hasCopy = hasListingCopy(book);
  if (key === "scan") return "done";
  if (key === "market") return hasMarket ? "done" : reading || book.status === "failed" ? "now" : "wait";
  if (key === "print") return hasMarket ? "done" : "wait";
  if (key === "copy") return hasCopy ? "done" : reading ? "wait" : "now";
  if (key === "photo") return hasCopy ? "done" : reading ? "wait" : "now";
  if (isAccepted(book.status)) return "done";
  if (book.status === "ready_for_review") return "now";
  return "wait";
}

export function DraftPanel({
  book,
  acceptError,
  notice,
  readingBack,
  accepting,
  onPatch,
  onAccept,
  onRetry,
  onFront,
  onBack,
}: {
  book: Draft | undefined;
  acceptError: string | null;
  notice: string | null;
  readingBack: boolean;
  accepting: boolean;
  onPatch: (patch: DraftPatch) => void;
  onAccept: () => void;
  onRetry: () => void;
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

  const locked = isLocked(book.status);
  const reading = isReading(book.status);
  const accepted = isAccepted(book.status);
  const missingCopy = !hasListingCopy(book);
  const blurbLength = book.description?.trim().length ?? 0;

  return (
    <section ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto bg-bg">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-line px-4 py-4 md:px-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">How this one moves</p>
          <h2 className="mt-1 max-w-3xl font-display text-5xl leading-none tracking-tight md:text-6xl">
            {book.title || (reading ? "Reading this ISBN" : "No record for this ISBN")}
          </h2>
          <p className="mt-2 font-cond text-xl">
            {book.author || "Author missing"} · <span className="font-mono text-base">{book.isbn}</span>
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
        {accepted
          ? "This snapshot is accepted. The price and text stay put."
          : (steps.find((step) => stepState(book, step.key) === "now")?.caption ?? "")}
      </p>

      {reading ? (
        <p className="blink border-b-2 border-line bg-signal px-4 py-4 font-display text-4xl tracking-tight text-on-signal md:px-6">
          Reading this ISBN
        </p>
      ) : null}

      {book.status === "failed" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line bg-hot px-4 py-3 text-white md:px-6">
          <p className="font-cond text-xl">
            {book.errorMessage ?? "The lookup failed."} Try again, or fill in the draft by hand.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="border-2 border-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]"
          >
            Look it up again
          </button>
        </div>
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
          {missingCopy && !locked ? (
            <p className="mt-3 text-base leading-snug">
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
                  onClick={() => onPatch({ condition: grade })}
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
              value={book.internalQty}
              disabled={locked}
              onChange={(event) => onPatch({ internalQty: Math.max(1, Math.floor(Number(event.target.value)) || 1) })}
              className="border-2 border-line bg-input px-3 py-2 font-mono text-xl text-ink"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Stays in BookOps</p>
          </label>
          <label className="grid gap-1">
            <FieldLabel>Shelf or storage</FieldLabel>
            <input
              value={book.internalLocation ?? ""}
              disabled={locked}
              placeholder="Shelf A-14, storage"
              onChange={(event) => onPatch({ internalLocation: event.target.value })}
              className="border-2 border-line bg-input px-3 py-2 font-cond text-xl text-ink placeholder:text-muted"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Stays in BookOps</p>
          </label>
        </div>
        <label className="grid gap-1">
          <FieldLabel>Staff note</FieldLabel>
          <input
            value={book.internalNotes ?? ""}
            disabled={locked}
            placeholder="Anything the next person should know"
            onChange={(event) => onPatch({ internalNotes: event.target.value })}
            className="border-2 border-line bg-input px-3 py-2 font-cond text-xl text-ink placeholder:text-muted"
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Stays in BookOps</p>
        </label>
      </div>

      <div className="grid gap-4 border-t-2 border-line px-4 py-5 md:px-6">
        <Field label="Title" value={book.title ?? ""} disabled={locked} onChange={(title) => onPatch({ title })} />
        <Field label="Author" value={book.author ?? ""} disabled={locked} onChange={(author) => onPatch({ author })} />
        <label className="grid gap-1">
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={book.description ?? ""}
            disabled={locked}
            rows={5}
            onChange={(event) => onPatch({ description: event.target.value })}
            className="resize-y border-2 border-line bg-input px-3 py-2 font-serif text-lg leading-snug text-ink"
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {blurbLength === 0
              ? book.backCoverUrl
                ? "Type the blurb from the back-cover photo"
                : "No blurb yet"
              : blurbLength < MIN_BLURB
                ? `${blurbLength} / ${MIN_BLURB} characters minimum`
                : `${blurbLength} characters`}
          </p>
        </label>
      </div>

      <div className="border-t-2 border-line bg-panel px-4 py-4 md:px-6">
        {accepted ? (
          <p className="mb-3 border-2 border-live px-3 py-2 font-cond text-lg">
            Accepted {scannedLabel(book.updatedAt)}. Saved in BookOps. Antikvaari is not contacted until BookAPI is
            connected.
          </p>
        ) : null}
        {notice ? <p className="mb-3 border-2 border-live px-3 py-2 font-cond text-lg">{notice}</p> : null}
        {acceptError ? (
          <p className="mb-3 border-2 border-hot bg-hot px-3 py-2 font-cond text-lg text-white">{acceptError}</p>
        ) : null}
        {missingCopy && !locked ? (
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
          disabled={book.status !== "ready_for_review" || accepting}
          className="w-full border-2 border-line bg-signal px-4 py-4 font-display text-4xl tracking-tight text-on-signal disabled:bg-panel-2 disabled:text-muted"
        >
          {accepted
            ? "Snapshot accepted"
            : accepting
              ? "Accepting"
              : reading
                ? "Still reading"
                : book.status === "ready_for_review"
                  ? "Accept snapshot"
                  : "Photo first"}
        </button>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Accept locks this text, this price, and this photo. Edits save as you type.
        </p>
      </div>
    </section>
  );
}

function MarketBlock({
  book,
  locked,
  onPatch,
}: {
  book: Draft;
  locked: boolean;
  onPatch: (patch: DraftPatch) => void;
}) {
  const market = book.market;
  const recommended = market ? recommendedPrice(market, book.inPrint).recommended : null;
  const hasRange = book.suggestedPriceMin != null && book.suggestedPriceMax != null;
  return (
    <div className="relative grid gap-4 bg-panel-2 px-4 py-5 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="flex items-start justify-between gap-4">
          <FieldLabel>Market note</FieldLabel>
          {market ? (
            <span className="stamp px-2 py-1 text-sm">Live · {scannedLabel(market.searchedAt)}</span>
          ) : null}
        </div>
        {market ? (
          <div className="mt-3 grid gap-2">
            <p className="font-cond text-3xl leading-none font-semibold">
              {market.listingCount} cop{market.listingCount === 1 ? "y" : "ies"}
              {market.lowestPrice !== null ? ` from ${euro(market.lowestPrice)}` : ""}
            </p>
            {market.listingCount > 0 ? (
              <p className="text-lg">
                {market.usedItemCount} used · {market.newItemCount} new
                {market.sellerCount ? ` · ${market.sellerCount} seller${market.sellerCount === 1 ? "" : "s"}` : ""}
              </p>
            ) : null}
            <p className="text-lg">
              {market.listingCount === 0
                ? "Nothing on sale, so print status is unknown."
                : book.inPrint === true
                ? "New copies are on sale, so it is likely still in print."
                : book.inPrint === false
                  ? "No new copies listed. Treated as out of print."
                  : "Print status unknown."}
            </p>
            {market.listings.length > 0 ? (
              <ul className="font-mono text-sm">
                {market.listings.map((listing, index) => (
                  <li key={index}>
                    {euro(listing.price)} · {listing.condition} · {listing.seller}
                  </li>
                ))}
              </ul>
            ) : null}
            {market.catalogUrl ? (
              <a
                href={market.catalogUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] uppercase tracking-[0.14em] underline underline-offset-4"
              >
                Open on Antikvaari
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-lg">Market not read yet.</p>
        )}
      </div>
      <div className="border-2 border-line bg-panel p-3">
        <FieldLabel>Suggested price</FieldLabel>
        {recommended != null ? (
          <>
            {hasRange ? (
              <p className="mt-2 font-mono text-2xl">
                {euro(book.suggestedPriceMin!)} – {euro(book.suggestedPriceMax!)}
              </p>
            ) : null}
            <button
              type="button"
              disabled={locked}
              onClick={() => onPatch({ priceText: recommended.toFixed(2) })}
              className="mt-3 border-2 border-line bg-signal px-3 py-2 font-cond text-xl font-semibold text-on-signal disabled:opacity-50"
            >
              Use {euro(recommended)}
            </button>
            {market ? <p className="mt-3 text-base leading-snug">{market.reason}</p> : null}
          </>
        ) : (
          <p className="mt-2 text-lg">
            {market?.reason ?? "No suggestion. Set the price yourself. Scarcity is not assumed."}
          </p>
        )}
        <label className="mt-4 grid gap-1">
          <FieldLabel>Final price</FieldLabel>
          <span className="flex border-2 border-line bg-input">
            <span className="grid place-items-center px-3 font-mono text-xl">€</span>
            <input
              value={book.priceText}
              disabled={locked}
              inputMode="decimal"
              onChange={(event) => onPatch({ priceText: event.target.value })}
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
  book: BookRecord;
  locked: boolean;
  readingBack: boolean;
  onFront: (file: File) => void;
  onBack: (file: File) => void;
}) {
  const source = coverSourceLabel(book.coverSource);
  return (
    <div className="grid content-start gap-3">
      <CoverImage key={`front:${book.coverUrl}`} url={book.coverUrl} alt={`${book.title ?? book.isbn} cover`} />
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {source ? `Cover · ${source}` : "No cover"}
      </p>
      {book.backCoverUrl ? (
        <CoverImage
          key={`back:${book.backCoverUrl}`}
          url={book.backCoverUrl}
          alt={`${book.title ?? book.isbn} back cover`}
        />
      ) : null}
      {readingBack ? <p className="blink font-cond text-xl font-semibold">Saving the photo</p> : null}
      {locked ? null : (
        <div className="grid gap-2">
          <PhotoButton label={book.coverUrl ? "Replace cover" : "Photograph the front"} onFile={onFront} />
          <PhotoButton label={book.backCoverUrl ? "Replace back cover" : "Photograph the back"} onFile={onBack} />
          <p className="text-sm leading-snug text-muted">
            A shop photo overrides a database cover. Type the blurb from the back photo into Description.
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
    // Covers are remote catalog images or shop photos. A plain img keeps both without a loader config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className="aspect-[2/3] w-full border-2 border-line object-cover"
    />
  );
}

export function PhotoButton({ label, onFile }: { label: string; onFile: (file: File) => void }) {
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
