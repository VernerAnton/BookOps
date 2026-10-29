# PageOps

**Page** (book) **ops** — ISBN queue, enrichment, review, and listing workflow for the bookshop floor. Built for Antikvaari.fi (mock publish today; real BookAPI when merchant access is ready).

## What it does

| Area | Behavior |
|------|----------|
| **Dashboard** | One screen: ISBN bar, queue, and the selected book's price, text, cover, shelf notes, and publish |
| **Enrichment** | Open Library metadata + cover; mock Antikvaari market & pricing |
| **Needs photo** | Mobile task when cover or description is missing |
| **Mobile UI** | `/mobile/task/[id]` — cover + back upload (POC text extraction) |
| **Review UI** | Antikvaari-like form + internal qty / location / notes |
| **Publish** | Mock BookAPI until real credentials |

## Run locally

```bash
npm install
npm run dev -- -p 43123
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Sample ISBNs: `9780141036144`, `9789510269335`.

## API

- `GET/POST /api/books`
- `GET/PATCH /api/books/[id]`
- `POST /api/books/[id]/enrich` · `/photos` · `/publish`

SQLite database: `data/pageops.db` (gitignored).

## Repo

Create the GitHub repository as **`pageops`** (private recommended until BookAPI is wired). Description suggestion:

> Bookstore listing ops — scan ISBN, enrich, review, publish to Antikvaari.
