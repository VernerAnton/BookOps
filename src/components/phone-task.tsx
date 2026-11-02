"use client";

import { useState } from "react";
import Link from "next/link";
import { fileToJpegDataUrl } from "@/lib/images";
import { useQueue } from "@/lib/queue-store";
import { applyBookPatch, backCoverPatch } from "@/lib/resolve";
import { ThemeToggle } from "@/components/theme-toggle";

export function PhoneTask({ id }: { id: string }) {
  const [books, update] = useQueue();
  const book = books.find((item) => item.id === id);
  const [readingBack, setReadingBack] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveFront(file: File) {
    const coverUrl = await fileToJpegDataUrl(file);
    update((current) =>
      current.map((item) =>
        item.id === id ? applyBookPatch(item, { coverUrl, coverSource: "Shop photo" }) : item,
      ),
    );
    setMessage("Front cover is on the draft.");
  }

  async function saveBack(file: File) {
    setReadingBack(true);
    try {
      const dataUrl = await fileToJpegDataUrl(file);
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      update((current) =>
        current.map((item) => (item.id === id ? applyBookPatch(item, backCoverPatch(item, dataUrl)) : item)),
      );
      setMessage("Back cover stored. The blurb on the desk is a mock read.");
    } finally {
      setReadingBack(false);
    }
  }

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
        <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.16em] underline underline-offset-4">
          Back to the desk
        </Link>
        {book ? (
          <>
            <p className="font-mono text-sm">{book.isbn}</p>
            <h1 className="font-display text-5xl leading-none tracking-tight">{book.title}</h1>
            <p className="text-xl">{book.author}</p>
            <PhotoSlot label="Front cover" preview={book.coverUrl} onFile={(file) => void saveFront(file)} />
            <PhotoSlot label="Back cover" preview={book.backCoverUrl} onFile={(file) => void saveBack(file)} />
            {readingBack ? <p className="blink font-cond text-2xl font-semibold">Reading the back cover</p> : null}
            {book.description ? (
              <p className="border-2 border-line bg-panel p-3 font-serif text-lg">{book.description}</p>
            ) : (
              <p className="text-lg">The blurb is still empty. Photograph the back cover.</p>
            )}
            {message ? <p className="border-2 border-signal bg-signal px-3 py-2 text-on-signal">{message}</p> : null}
            <Link
              href="/"
              className="border-2 border-line bg-signal px-4 py-4 text-center font-display text-3xl text-on-signal"
            >
              Send to the desk
            </Link>
          </>
        ) : (
          <p className="font-cond text-3xl">This task is not in the queue.</p>
        )}
      </main>
    </div>
  );
}

function PhotoSlot({
  label,
  preview,
  onFile,
}: {
  label: string;
  preview: string | null;
  onFile: (file: File) => void;
}) {
  return (
    <label className="grid cursor-pointer gap-2 border-2 border-line bg-panel p-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em]">{label}</span>
      {preview ? (
        // Shop-floor photos are local data URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="max-h-64 w-full object-contain" />
      ) : (
        <span className="grid h-36 place-items-center border-2 border-dashed border-hot font-display text-3xl text-hot">
          Take photo
        </span>
      )}
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
