import type { BookRecord } from "@/lib/types";
import { euro, scannedLabel } from "@/lib/format";
import { statusLabel, statusStripe } from "@/components/status";

export function QueueList({
  books,
  selectedId,
  loading,
  onSelect,
}: {
  books: BookRecord[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  const open = books.filter((book) => book.status !== "approved" && book.status !== "live").length;
  return (
    <aside className="flex max-h-[42dvh] min-h-0 flex-col border-b-2 border-line bg-panel lg:h-full lg:max-h-none lg:w-[340px] lg:shrink-0 lg:border-r-2 lg:border-b-0">
      <div className="flex items-baseline justify-between border-b-2 border-line px-4 py-3">
        <h2 className="font-display text-3xl leading-none tracking-tight">Queue</h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          {open} open · {books.length} total
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {books.length === 0 ? (
          <li className="px-4 py-6 text-lg text-muted">
            {loading ? "Loading the queue" : "Scan a book to start a listing."}
          </li>
        ) : (
          books.map((book) => {
            const selected = book.id === selectedId;
            return (
              <li key={book.id} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => onSelect(book.id)}
                  aria-current={selected ? "true" : undefined}
                  className={`grid w-full grid-cols-[8px_1fr] text-left ${
                    selected ? "bg-signal text-on-signal" : "bg-panel text-ink"
                  }`}
                >
                  <span className={statusStripe[book.status]} />
                  <span className="px-3 py-3">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-cond text-xl leading-none font-semibold tracking-tight">
                        {book.title || (book.status === "enriching" ? "Reading ISBN" : "No title yet")}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em]">
                        {statusLabel[book.status]}
                      </span>
                    </span>
                    <span className="mt-2 flex items-baseline justify-between gap-3 font-mono text-xs">
                      <span>{book.isbn}</span>
                      <span>{book.price == null ? "No price" : euro(book.price)}</span>
                    </span>
                    <span className="mt-1 block text-sm opacity-80">
                      {book.condition ?? "Condition open"} · {scannedLabel(book.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
