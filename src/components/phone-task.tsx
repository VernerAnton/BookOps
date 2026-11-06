"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { BookRecord } from "@/lib/types";
import { fetchBook, sendPhotos } from "@/lib/books-client";
import { fileToJpegDataUrl } from "@/lib/images";
import { hasListingCopy, isLocked } from "@/lib/listing";
import { ThemeToggle } from "@/components/theme-toggle";

export function PhoneTask() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<BookRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<"front" | "back" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchBook(id)
      .then((next) => {
        if (active) setBook(next);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load this listing.");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function save(file: File, side: "front" | "back") {
    setSaving(side);
    setError(null);
    setMessage(null);
    try {
      const dataUrl = await fileToJpegDataUrl(file);
      const next = await sendPhotos(id, side === "front" ? { coverDataUrl: dataUrl } : { backDataUrl: dataUrl });
      if (next) setBook(next);
      setMessage(
        side === "front"
          ? "Front cover is on the draft."
          : "Back cover is on the draft. Type its blurb on the desk.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the photo.");
    } finally {
      setSaving(null);
    }
  }

  const locked = book ? isLocked(book.status) : false;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div className="h-2 hazard" />
      <header className="flex items-center justify-between gap-3 border-b-2 border-line px-4 py-3">
        <div>
          <p className="font-display text-4xl leading-none">
            BOOK<span className="ml-1 inline-block bg-signal px-1.5 text-on-signal">OPS</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Shop floor</p>
        </div>
        <ThemeToggle />
      </header>
      <main className="grid gap-4 px-4 py-5">
        <Link href={`/books/${id}`} className="font-mono text-[11px] uppercase tracking-[0.16em] underline underline-offset-4">
          Back to the desk
        </Link>
        {!loaded ? (
          <p className="blink font-cond text-3xl">Loading the task</p>
        ) : book ? (
          <>
            <p className="font-mono text-sm">{book.isbn}</p>
            <h1 className="font-display text-5xl leading-none tracking-tight">{book.title || "No title yet"}</h1>
            <p className="text-xl">{book.author || "Author missing"}</p>
            {locked ? (
              <p className="border-2 border-line bg-panel p-3 font-cond text-xl">
                This listing is locked right now. Nothing to photograph.
              </p>
            ) : (
              <>
                <PhotoSlot
                  label="Front cover"
                  preview={book.coverUrl}
                  busy={saving === "front"}
                  onFile={(file) => void save(file, "front")}
                />
                <PhotoSlot
                  label="Back cover"
                  preview={book.backCoverUrl}
                  busy={saving === "back"}
                  onFile={(file) => void save(file, "back")}
                />
              </>
            )}
            {book.description ? (
              <p className="border-2 border-line bg-panel p-3 font-serif text-lg">{book.description}</p>
            ) : (
              <p className="text-lg">The blurb is still empty. Photograph the back cover.</p>
            )}
            {message ? <p className="border-2 border-signal bg-signal px-3 py-2 text-on-signal">{message}</p> : null}
            {error ? <p className="border-2 border-hot bg-hot px-3 py-2 text-white">{error}</p> : null}
            <Link
              href={`/books/${id}`}
              className="border-2 border-line bg-signal px-4 py-4 text-center font-display text-3xl text-on-signal"
            >
              {hasListingCopy(book) ? "Done. Back to the desk" : "Send to the desk"}
            </Link>
          </>
        ) : (
          <p className="font-cond text-3xl">{error ?? "This task is not in the queue."}</p>
        )}
      </main>
    </div>
  );
}

function PhotoSlot({
  label,
  preview,
  busy,
  onFile,
}: {
  label: string;
  preview: string | null;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className="grid cursor-pointer gap-2 border-2 border-line bg-panel p-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
        {busy ? "Saving" : preview ? `${label} · tap to replace` : label}
      </span>
      {preview ? (
        // Shop-floor photos are data URLs; catalog covers are remote images.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className={`max-h-64 w-full object-contain ${busy ? "blink" : ""}`} />
      ) : (
        <span
          className={`grid h-36 place-items-center border-2 border-dashed border-hot font-display text-3xl text-hot ${
            busy ? "blink" : ""
          }`}
        >
          Take photo
        </span>
      )}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
