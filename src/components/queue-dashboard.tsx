"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { BookRecord, BookStatus } from "@/lib/types";
import { formatEuro } from "@/lib/utils";

const filters: { label: string; value?: BookStatus }[] = [
  { label: "Kaikki" },
  { label: "Jonossa", value: "queued" },
  { label: "Tarvitsee kuvan", value: "needs_photo" },
  { label: "Tarkistettavana", value: "ready_for_review" },
  { label: "Myynnissä", value: "live" },
];

export function QueueDashboard() {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [filter, setFilter] = useState<BookStatus | undefined>();
  const [isbn, setIsbn] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/books${qs}`);
    const data = await res.json();
    setBooks(data.books ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

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
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] ?? "Lisäys epäonnistui");
      setIsbn("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Virhe");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-[#343c27]/60">
            Antikvaari työjono · POC
          </p>
          <h1 className="font-serif text-3xl text-[#343c27]">Uudet kirjat myyntiin</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#343c27]/70">
            Skannaa tai syötä ISBN — rikastus, tarkistus ja puhelin-kuvatehtävät toimivat.
            Julkaisu simuloidaan kunnes BookAPI-integraatio on valmis.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#343c27]">Lisää ISBN jonoon</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={addIsbn} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="esim. 9789511234567 tai skannattu viivakoodi"
              className="h-11 flex-1 rounded-md border border-[#343c27]/20 bg-[#f8f7f3] px-3 text-[#343c27] outline-none ring-[#343c27]/30 focus:ring-2"
              inputMode="numeric"
              required
            />
            <Button type="submit" disabled={submitting} className="sm:min-w-40">
              {submitting ? "Käsitellään…" : "Lisää ja rikasta"}
            </Button>
          </form>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          <p className="mt-3 text-xs text-[#343c27]/60">
            Kokeile: 9780141036144 (1984), 9789510269335 (Tuntematon sotilas)
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === f.value
                ? "bg-[#343c27] text-[#f8f7f3]"
                : "bg-white text-[#343c27] ring-1 ring-[#343c27]/15"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Jono</h2>
          <Button variant="ghost" size="sm" onClick={load}>
            Päivitä
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-sm text-[#343c27]/60">Ladataan…</p>
          ) : books.length === 0 ? (
            <p className="p-4 text-sm text-[#343c27]/60">Ei kirjoja tässä suodattimessa.</p>
          ) : (
            <ul className="divide-y divide-[#343c27]/10">
              {books.map((book) => (
                <li key={book.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-[#f3f2ec]">
                      {book.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.coverUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={book.status} />
                        <span className="text-xs text-[#343c27]/50">ISBN {book.isbn}</span>
                      </div>
                      <p className="truncate font-medium text-[#343c27]">
                        {book.title ?? "Odottaa tietoja"}
                      </p>
                      <p className="truncate text-sm text-[#343c27]/70">
                        {book.author ?? "—"}
                        {book.price != null ? ` · ${formatEuro(book.price)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {book.status === "needs_photo" && book.mobileTaskToken ? (
                      <Link href={`/mobile/task/${book.id}`}>
                        <Button variant="secondary" size="sm">
                          Puhelintehtävä
                        </Button>
                      </Link>
                    ) : null}
                    <Link href={`/books/${book.id}`}>
                      <Button size="sm">
                        {book.status === "live" ? "Näytä" : "Tarkista"}
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
