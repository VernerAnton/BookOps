"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import type { BookRecord, ConditionGrade } from "@/lib/types";
import { formatEuro } from "@/lib/utils";

const conditions: ConditionGrade[] = ["K5", "K4", "K3", "K2", "K1"];

const field =
  "w-full rounded-md border border-[#343c27]/20 bg-white px-2.5 py-1.5 text-sm outline-none ring-[#343c27]/30 focus:ring-2";

export function QueueDashboard({ initialBookId }: { initialBookId?: string }) {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [draft, setDraft] = useState<BookRecord | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const select = useCallback((book: BookRecord | null) => {
    setDraft(book);
    setDirty(false);
    setMessage(null);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/books");
    const data = await res.json();
    const next: BookRecord[] = data.books ?? [];
    setBooks(next);
    setLoading(false);
    setDraft((current) => {
      if (dirty && current) return current;
      if (current) {
        return next.find((b) => b.id === current.id) ?? current;
      }
      if (initialBookId) {
        return next.find((b) => b.id === initialBookId) ?? next[0] ?? null;
      }
      return next[0] ?? null;
    });
  }, [dirty, initialBookId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  function edit(patch: Partial<BookRecord>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  }

  async function addIsbn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn, autoEnrich: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Lisäys epäonnistui");
      setIsbn("");
      setDirty(false);
      select(data.book);
      await load();
      if (data.book) select(data.book);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Virhe");
    } finally {
      setSubmitting(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/books/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(draft, "ready_for_review")),
    });
    const data = await res.json();
    setDirty(false);
    if (data.book) select(data.book);
    setSaving(false);
    setMessage("Tallennettu.");
    await load();
  }

  async function publish() {
    if (!draft) return;
    setPublishing(true);
    setMessage(null);
    await fetch(`/api/books/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(draft, draft.status)),
    });
    const res = await fetch(`/api/books/${draft.id}/publish`, { method: "POST" });
    const data = await res.json();
    setDirty(false);
    if (data.book) select(data.book);
    setPublishing(false);
    setMessage(res.ok ? data.message : (data.error ?? "Hyväksyntä epäonnistui"));
    await load();
  }

  async function uploadPhoto(file: File, which: "cover" | "back") {
    if (!draft) return;
    const dataUrl = await readFile(file);
    const body =
      which === "cover"
        ? { coverDataUrl: dataUrl }
        : { backDataUrl: dataUrl };
    const res = await fetch(`/api/books/${draft.id}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.book) select(data.book);
    setMessage(
      which === "back"
        ? "Takakannen kuva tallennettu. Kirjoita kuvaus."
        : "Kansikuva tallennettu.",
    );
    await load();
  }

  const waiting = books.filter(
    (b) => b.status !== "live" && b.status !== "approved",
  ).length;

  return (
    <div className="flex h-dvh flex-col bg-[#f8f7f3] text-[#343c27]">
      <header className="flex shrink-0 flex-col gap-3 border-b border-[#343c27]/10 bg-white px-4 py-3 sm:flex-row sm:items-center">
        <div className="shrink-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#343c27]/50">
            BookOps
          </p>
          <p className="text-sm text-[#343c27]/70">
            {loading ? "Ladataan…" : `${waiting} kesken · ${books.length} yhteensä`}
          </p>
        </div>
        <form onSubmit={addIsbn} className="flex min-w-0 flex-1 gap-2">
          <input
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="ISBN tai viivakoodi"
            className="h-10 min-w-0 flex-1 rounded-md border border-[#343c27]/20 bg-[#f8f7f3] px-3 text-sm outline-none ring-[#343c27]/30 focus:ring-2"
            inputMode="numeric"
            required
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "…" : "Lisää"}
          </Button>
        </form>
      </header>
      {error ? (
        <p className="shrink-0 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-[#343c27]/10 lg:border-r">
          {books.length === 0 && !loading ? (
            <p className="p-4 text-sm text-[#343c27]/60">
              Jono on tyhjä. Syötä ISBN ylhäällä.
            </p>
          ) : (
            <ul>
              {books.map((book) => {
                const active = draft?.id === book.id;
                return (
                  <li key={book.id}>
                    <button
                      type="button"
                      onClick={() => select(book)}
                      className={`flex w-full gap-3 px-3 py-3 text-left ${
                        active ? "bg-white" : "hover:bg-white/70"
                      }`}
                    >
                      <span className="h-14 w-10 shrink-0 overflow-hidden rounded bg-[#eceae2]">
                        {book.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.coverUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <StatusBadge status={book.status} />
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium">
                          {book.title ?? book.isbn}
                        </span>
                        <span className="block truncate text-xs text-[#343c27]/60">
                          {book.price != null ? formatEuro(book.price) : "Ei hintaa"}
                          {book.author ? ` · ${book.author}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <main className="min-h-0 overflow-y-auto bg-white">
          {!draft ? (
            <p className="p-8 text-sm text-[#343c27]/60">
              Valitse kirja jonosta, tai lisää uusi ISBN.
            </p>
          ) : (
            <div className="grid gap-6 p-4 xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-2xl">
                    {draft.title || "Nimetön teos"}
                  </h1>
                  <StatusBadge status={draft.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Otsikko</span>
                    <input
                      className={field}
                      value={draft.title ?? ""}
                      onChange={(e) => edit({ title: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Tekijä</span>
                    <input
                      className={field}
                      value={draft.author ?? ""}
                      onChange={(e) => edit({ author: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Hinta €</span>
                    <input
                      type="number"
                      step="0.01"
                      className={field}
                      value={draft.price ?? ""}
                      onChange={(e) =>
                        edit({ price: Number(e.target.value) || null })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Kunto</span>
                    <select
                      className={field}
                      value={draft.condition ?? ""}
                      onChange={(e) =>
                        edit({
                          condition: (e.target.value as ConditionGrade) || null,
                        })
                      }
                    >
                      <option value="">Valitse…</option>
                      {conditions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Kappaleet</span>
                    <input
                      type="number"
                      min={1}
                      className={field}
                      value={draft.internalQty}
                      onChange={(e) =>
                        edit({ internalQty: Number(e.target.value) || 1 })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Sijainti</span>
                    <input
                      className={field}
                      placeholder="Hylly A3, varasto…"
                      value={draft.internalLocation ?? ""}
                      onChange={(e) => edit({ internalLocation: e.target.value })}
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Kuvaus</span>
                  <textarea
                    rows={6}
                    className={field}
                    value={draft.description ?? ""}
                    onChange={(e) => edit({ description: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Omat muistiinpanot</span>
                  <textarea
                    rows={2}
                    className={field}
                    value={draft.internalNotes ?? ""}
                    onChange={(e) => edit({ internalNotes: e.target.value })}
                  />
                </label>

                {draft.status === "needs_photo" || !draft.coverUrl || !draft.description ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <p className="font-medium">Kuva tai takateksti puuttuu</p>
                    <p className="mt-1 text-[#343c27]/70">
                      Ota kuva tässä, tai avaa sama tehtävä puhelimessa.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label>
                        Kansi
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="mt-1 block w-full text-xs"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadPhoto(f, "cover");
                          }}
                        />
                      </label>
                      <label>
                        Takakansi
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="mt-1 block w-full text-xs"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadPhoto(f, "back");
                          }}
                        />
                      </label>
                    </div>
                    <a
                      className="mt-3 inline-block text-xs underline"
                      href={`/mobile/task/${draft.id}`}
                    >
                      Avaa puhelimessa
                    </a>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={save} disabled={saving}>
                    {saving ? "Tallennetaan…" : "Tallenna"}
                  </Button>
                  <Button
                    onClick={publish}
                    disabled={
                      publishing ||
                      draft.status === "approved" ||
                      draft.status === "live"
                    }
                  >
                    {publishing
                      ? "Tallennetaan…"
                      : draft.status === "approved"
                        ? "Hyväksytty"
                        : "Hyväksy luonnos"}
                  </Button>
                  {message ? (
                    <span className="text-sm text-[#343c27]/70">{message}</span>
                  ) : null}
                </div>
                {draft.market?.catalogUrl ? (
                  <a
                    className="block text-sm underline"
                    href={draft.market.catalogUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Avaa vertailu Antikvaarissa
                  </a>
                ) : null}
              </div>

              <aside className="space-y-4">
                <div className="overflow-hidden rounded-lg bg-[#f3f2ec]">
                  {draft.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.coverUrl}
                      alt=""
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center text-sm text-[#343c27]/50">
                      Ei kantta
                    </div>
                  )}
                </div>
                <div className="rounded-lg bg-[#f8f7f3] p-3 text-sm">
                  <p className="font-medium">ISBN {draft.isbn}</p>
                  {draft.market ? (
                    <>
                      <p className="mt-2">
                        {draft.market.listingCount} kpl
                        {draft.market.sellerCount
                          ? ` · ${draft.market.sellerCount} myyjää`
                          : ""}
                        {" · alin "}
                        {draft.market.lowestPrice != null
                          ? formatEuro(draft.market.lowestPrice)
                          : "—"}
                      </p>
                      <p>
                        Uusia kappaleita:{" "}
                        {draft.inPrint == null
                          ? "—"
                          : draft.inPrint
                            ? `${draft.market.newItemCount}`
                            : "ei"}
                      </p>
                      <p className="mt-2 text-[#343c27]/80">{draft.market.reason}</p>
                      {draft.suggestedPriceMin != null &&
                      draft.suggestedPriceMax != null ? (
                        <p>
                          Ehdotus {formatEuro(draft.suggestedPriceMin)}–
                          {formatEuro(draft.suggestedPriceMax)}
                        </p>
                      ) : null}
                      <ul className="mt-2 max-h-36 space-y-1 overflow-auto text-xs text-[#343c27]/75">
                        {draft.market.listings.map((l, i) => (
                          <li key={i}>
                            {formatEuro(l.price)} · {l.condition} · {l.seller}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-2 text-[#343c27]/60">Ei markkinatietoja vielä.</p>
                  )}
                </div>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function payload(book: BookRecord, status: BookRecord["status"]) {
  return {
    title: book.title,
    author: book.author,
    description: book.description,
    price: book.price ?? undefined,
    condition: book.condition ?? undefined,
    internalQty: book.internalQty,
    internalLocation: book.internalLocation,
    internalNotes: book.internalNotes,
    status,
  };
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
