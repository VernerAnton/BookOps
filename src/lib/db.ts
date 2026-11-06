import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import type {
  BookRecord,
  BookStatus,
  ConditionGrade,
  CreateBookInput,
  MarketSnapshot,
  UpdateBookInput,
} from "./types";

const dbPath = path.join(process.cwd(), "data", "bookops.db");

function getDb() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      isbn TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      title TEXT,
      author TEXT,
      description TEXT,
      suggested_price_min REAL,
      suggested_price_max REAL,
      price REAL,
      condition TEXT,
      internal_qty INTEGER NOT NULL DEFAULT 1,
      internal_location TEXT,
      internal_notes TEXT,
      cover_url TEXT,
      cover_source TEXT,
      back_cover_url TEXT,
      in_print INTEGER,
      market_json TEXT,
      antikvaari_listing_id TEXT,
      antikvaari_listing_url TEXT,
      mobile_task_token TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
    CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
    CREATE INDEX IF NOT EXISTS idx_books_mobile_token ON books(mobile_task_token);
  `);
  const columns = db.prepare("PRAGMA table_info(books)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "back_cover_url")) {
    db.exec("ALTER TABLE books ADD COLUMN back_cover_url TEXT");
  }
}

type Row = {
  id: string;
  isbn: string;
  status: string;
  title: string | null;
  author: string | null;
  description: string | null;
  suggested_price_min: number | null;
  suggested_price_max: number | null;
  price: number | null;
  condition: string | null;
  internal_qty: number;
  internal_location: string | null;
  internal_notes: string | null;
  cover_url: string | null;
  cover_source: string | null;
  back_cover_url: string | null;
  in_print: number | null;
  market_json: string | null;
  antikvaari_listing_id: string | null;
  antikvaari_listing_url: string | null;
  mobile_task_token: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

function rowToBook(row: Row): BookRecord {
  return {
    id: row.id,
    isbn: row.isbn,
    status: row.status as BookStatus,
    title: row.title,
    author: row.author,
    description: row.description,
    suggestedPriceMin: row.suggested_price_min,
    suggestedPriceMax: row.suggested_price_max,
    price: row.price,
    condition: row.condition as ConditionGrade | null,
    internalQty: row.internal_qty,
    internalLocation: row.internal_location,
    internalNotes: row.internal_notes,
    coverUrl: row.cover_url,
    coverSource: row.cover_source,
    backCoverUrl: row.back_cover_url,
    inPrint: row.in_print === null ? null : row.in_print === 1,
    market: row.market_json
      ? (JSON.parse(row.market_json) as MarketSnapshot)
      : null,
    antikvaariListingId: row.antikvaari_listing_id,
    antikvaariListingUrl: row.antikvaari_listing_url,
    mobileTaskToken: row.mobile_task_token,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listBooks(status?: BookStatus): BookRecord[] {
  const db = getDb();
  initDb(db);
  const rows = status
    ? (db
        .prepare("SELECT * FROM books WHERE status = ? ORDER BY created_at DESC")
        .all(status) as Row[])
    : (db
        .prepare("SELECT * FROM books ORDER BY created_at DESC")
        .all() as Row[]);
  db.close();
  return rows.map(rowToBook);
}

export function getBookById(id: string): BookRecord | null {
  const db = getDb();
  initDb(db);
  const row = db.prepare("SELECT * FROM books WHERE id = ?").get(id) as
    | Row
    | undefined;
  db.close();
  return row ? rowToBook(row) : null;
}

export function getBookByMobileToken(token: string): BookRecord | null {
  const db = getDb();
  initDb(db);
  const row = db
    .prepare("SELECT * FROM books WHERE mobile_task_token = ?")
    .get(token) as Row | undefined;
  db.close();
  return row ? rowToBook(row) : null;
}

export function createBook(input: CreateBookInput): BookRecord {
  const db = getDb();
  initDb(db);
  const now = new Date().toISOString();
  const id = randomUUID();
  const isbn = input.isbn.replace(/[^0-9Xx]/g, "");
  db.prepare(
    `INSERT INTO books (id, isbn, status, internal_qty, created_at, updated_at)
     VALUES (?, ?, 'queued', 1, ?, ?)`,
  ).run(id, isbn, now, now);
  db.close();
  return getBookById(id)!;
}

export function updateBook(id: string, input: UpdateBookInput): BookRecord | null {
  const db = getDb();
  initDb(db);
  const existing = getBookById(id);
  if (!existing) {
    db.close();
    return null;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  const map: Record<string, unknown> = {
    title: input.title,
    author: input.author,
    description: input.description,
    price: input.price,
    condition: input.condition,
    internal_qty: input.internalQty,
    internal_location: input.internalLocation,
    internal_notes: input.internalNotes,
    status: input.status,
  };

  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${col} = ?`);
      values.push(val);
    }
  }

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE books SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  db.close();
  return getBookById(id);
}

export function saveEnrichment(
  id: string,
  data: {
    status: BookStatus;
    title?: string | null;
    author?: string | null;
    description?: string | null;
    suggestedPriceMin?: number | null;
    suggestedPriceMax?: number | null;
    price?: number | null;
    coverUrl?: string | null;
    coverSource?: string | null;
    inPrint?: boolean | null;
    market?: MarketSnapshot | null;
    mobileTaskToken?: string | null;
    errorMessage?: string | null;
  },
): BookRecord | null {
  const db = getDb();
  initDb(db);
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE books SET
      status = ?,
      title = COALESCE(?, title),
      author = COALESCE(?, author),
      description = COALESCE(?, description),
      suggested_price_min = COALESCE(?, suggested_price_min),
      suggested_price_max = COALESCE(?, suggested_price_max),
      price = COALESCE(?, price),
      cover_url = COALESCE(?, cover_url),
      cover_source = COALESCE(?, cover_source),
      in_print = ?,
      market_json = ?,
      mobile_task_token = COALESCE(?, mobile_task_token),
      error_message = ?,
      updated_at = ?
     WHERE id = ?`,
  ).run(
    data.status,
    data.title ?? null,
    data.author ?? null,
    data.description ?? null,
    data.suggestedPriceMin ?? null,
    data.suggestedPriceMax ?? null,
    data.price ?? null,
    data.coverUrl ?? null,
    data.coverSource ?? null,
    data.inPrint === null || data.inPrint === undefined
      ? null
      : data.inPrint
        ? 1
        : 0,
    data.market ? JSON.stringify(data.market) : null,
    data.mobileTaskToken ?? null,
    data.errorMessage ?? null,
    now,
    id,
  );
  db.close();
  return getBookById(id);
}

export function savePhotos(
  id: string,
  data: {
    status: BookStatus;
    coverUrl: string | null;
    coverSource: string | null;
    backCoverUrl: string | null;
  },
): BookRecord | null {
  const db = getDb();
  initDb(db);
  db.prepare(
    `UPDATE books SET
      status = ?,
      cover_url = ?,
      cover_source = ?,
      back_cover_url = ?,
      updated_at = ?
     WHERE id = ?`,
  ).run(
    data.status,
    data.coverUrl,
    data.coverSource,
    data.backCoverUrl,
    new Date().toISOString(),
    id,
  );
  db.close();
  return getBookById(id);
}

export function savePublishResult(
  id: string,
  data: {
    status: BookStatus;
    antikvaariListingId: string;
    antikvaariListingUrl: string;
    errorMessage?: string | null;
  },
): BookRecord | null {
  const db = getDb();
  initDb(db);
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE books SET
      status = ?,
      antikvaari_listing_id = ?,
      antikvaari_listing_url = ?,
      error_message = ?,
      updated_at = ?
     WHERE id = ?`,
  ).run(
    data.status,
    data.antikvaariListingId,
    data.antikvaariListingUrl,
    data.errorMessage ?? null,
    now,
    id,
  );
  db.close();
  return getBookById(id);
}

export function countByStatus(): Record<BookStatus, number> {
  const db = getDb();
  initDb(db);
  const rows = db
    .prepare("SELECT status, COUNT(*) as c FROM books GROUP BY status")
    .all() as { status: string; c: number }[];
  db.close();
  const base: Record<BookStatus, number> = {
    queued: 0,
    enriching: 0,
    needs_photo: 0,
    ready_for_review: 0,
    approved: 0,
    publishing: 0,
    live: 0,
    failed: 0,
  };
  for (const row of rows) {
    base[row.status as BookStatus] = row.c;
  }
  return base;
}
