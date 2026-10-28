"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { BookRecord, ConditionGrade } from "@/lib/types";
import { formatEuro } from "@/lib/utils";

const conditions: ConditionGrade[] = ["K5", "K4", "K3", "K2", "K1"];

export function BookReviewClient({ id }: { id: string }) {
  const [book, setBook] = useState<BookRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/books/${id}`);
    const data = await res.json();
    setBook(data.book ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save() {
    if (!book) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: book.title,
        author: book.author,
        description: book.description,
        price: book.price,
        condition: book.condition,
        internalQty: book.internalQty,
        internalLocation: book.internalLocation,
        internalNotes: book.internalNotes,
        status: "ready_for_review",
      }),
    });
    const data = await res.json();
    setBook(data.book);
    setSaving(false);
    setMessage("Luonnos tallennettu.");
  }

  async function approveAndPublish() {
    if (!book) return;
    setPublishing(true);
    setMessage(null);
    await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: book.title,
        author: book.author,
        description: book.description,
        price: book.price,
        condition: book.condition ?? "K3",
        internalQty: book.internalQty,
        internalLocation: book.internalLocation,
        internalNotes: book.internalNotes,
        status: "approved",
      }),
    });
    const res = await fetch(`/api/books/${id}/publish`, { method: "POST" });
    const data = await res.json();
    setBook(data.book);
    setPublishing(false);
    if (res.ok) {
      setMessage("POC: Kirja “julkaistu” mock-API:lla.");
    } else {
      setMessage(data.error ?? "Julkaisu epäonnistui");
    }
  }

  if (loading) {
    return <p className="p-8 text-sm text-[#343c27]/60">Ladataan…</p>;
  }

  if (!book) {
    return <p className="p-8 text-sm text-red-700">Teosta ei löytynyt.</p>;
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Link href="/" className="text-sm text-[#343c27]/70 hover:underline">
          ← Takaisin jonoon
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl text-[#343c27]">Tuotteen esikatselu</h1>
          <StatusBadge status={book.status} />
        </div>
        <p className="text-sm text-[#343c27]/70">
          Layout muistuttaa kauppias-/BookAPI-näkymää. Sisäiset kentät eivät mene Antikvaariin (POC).
        </p>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Myyntiin Antikvaariin (simuloitu lomake)</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Otsikko</span>
                <input
                  className="w-full rounded-md border border-[#343c27]/20 bg-[#f8f7f3] px-3 py-2"
                  value={book.title ?? ""}
                  onChange={(e) => setBook({ ...book, title: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Tekijä</span>
                <input
                  className="w-full rounded-md border border-[#343c27]/20 bg-[#f8f7f3] px-3 py-2"
                  value={book.author ?? ""}
                  onChange={(e) => setBook({ ...book, author: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">ISBN</span>
                <input
                  readOnly
                  className="w-full rounded-md border border-[#343c27]/20 bg-[#eceae2] px-3 py-2"
                  value={book.isbn}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Hinta (€)</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-[#343c27]/20 bg-[#f8f7f3] px-3 py-2"
                  value={book.price ?? ""}
                  onChange={(e) =>
                    setBook({ ...book, price: Number(e.target.value) || null })
                  }
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">Kunto</span>
                <select
                  className="w-full rounded-md border border-[#343c27]/20 bg-[#f8f7f3] px-3 py-2"
                  value={book.condition ?? ""}
                  onChange={(e) =>
                    setBook({
                      ...book,
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
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">Kuvaus (julkinen)</span>
                <textarea
                  rows={8}
                  className="w-full rounded-md border border-[#343c27]/20 bg-[#f8f7f3] px-3 py-2"
                  value={book.description ?? ""}
                  onChange={(e) => setBook({ ...book, description: e.target.value })}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#343c27]/10 pt-4">
              <Button variant="secondary" onClick={save} disabled={saving}>
                Tallenna luonnos
              </Button>
              <Button
                onClick={approveAndPublish}
                disabled={publishing || book.status === "live"}
              >
                {publishing ? "Julkaistaan…" : "Hyväksy ja julkaise (mock)"}
              </Button>
              {book.status === "needs_photo" ? (
                <Link href={`/mobile/task/${book.id}`}>
                  <Button variant="secondary">Avaa puhelintehtävä</Button>
                </Link>
              ) : null}
            </div>
            {message ? <p className="text-sm text-[#343c27]/80">{message}</p> : null}
            {book.antikvaariListingUrl ? (
              <p className="text-sm">
                Mock-listaus:{" "}
                <a
                  className="text-[#343c27] underline"
                  href={book.antikvaariListingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {book.antikvaariListingUrl}
                </a>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-lg bg-[#f3f2ec]">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-sm text-[#343c27]/50">
                  Ei kansikuvaa
                </div>
              )}
            </div>
            {book.coverSource ? (
              <p className="mt-2 text-center text-xs text-[#343c27]/50">
                Lähde: {book.coverSource}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Sisäinen (ei Antikvaariin)</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Kappalemäärä</span>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-[#343c27]/20 px-3 py-2"
                value={book.internalQty}
                onChange={(e) =>
                  setBook({ ...book, internalQty: Number(e.target.value) || 1 })
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Sijainti / varasto</span>
              <input
                className="w-full rounded-md border border-[#343c27]/20 px-3 py-2"
                placeholder="Hylly A3, varasto 2…"
                value={book.internalLocation ?? ""}
                onChange={(e) =>
                  setBook({ ...book, internalLocation: e.target.value })
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Muistiinpanot</span>
              <textarea
                rows={3}
                className="w-full rounded-md border border-[#343c27]/20 px-3 py-2"
                value={book.internalNotes ?? ""}
                onChange={(e) => setBook({ ...book, internalNotes: e.target.value })}
              />
            </label>
          </CardContent>
        </Card>

        {book.market ? (
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Antikvaari-markkina (mock)</h3>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                {book.market.listingCount} tarjousta · alin{" "}
                {book.market.lowestPrice != null
                  ? formatEuro(book.market.lowestPrice)
                  : "—"}
              </p>
              <p>
                Painossa:{" "}
                {book.inPrint == null ? "—" : book.inPrint ? "Kyllä" : "Ei / vanha painos"}
              </p>
              {book.suggestedPriceMin != null && book.suggestedPriceMax != null ? (
                <p>
                  Ehdotus: {formatEuro(book.suggestedPriceMin)} –{" "}
                  {formatEuro(book.suggestedPriceMax)}
                </p>
              ) : null}
              <ul className="max-h-40 space-y-1 overflow-auto text-xs text-[#343c27]/80">
                {book.market.listings.map((l, i) => (
                  <li key={i}>
                    {formatEuro(l.price)} · {l.condition} · {l.seller}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
