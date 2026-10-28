# Antikvaari listing workflow (POC)

Proof of concept for a bookstore ISBN queue: enrichment, boss review, mobile photo tasks, and **mock** Antikvaari publish. Real BookAPI integration is stubbed until merchant credentials exist.

## What works in this POC

| Area | Behavior |
|------|----------|
| **Dashboard** | Add ISBN to queue, filter by status, auto-refresh |
| **Enrichment** | Open Library metadata + cover; mock Antikvaari market & pricing; in-print heuristic |
| **Needs photo** | Routes to mobile task when cover or description is missing |
| **Mobile UI** | `/mobile/task/[id]` — camera/file upload for cover + back (POC text extraction) |
| **Review UI** | Antikvaari-like form, internal qty/location/notes (not “published”) |
| **Publish** | **Mock** BookAPI — sets status `live` and a fake listing URL |

## Run locally

```bash
npm install
npm run dev -- -p 43123
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Try ISBNs:

- `9780141036144` — usually full metadata from Open Library  
- `9789510269335` — Finnish title example  
- Obscure / invalid ISBN — more likely **Tarvitsee kuvan** → mobile flow  

## API (POC)

- `GET/POST /api/books` — list / create (+ auto enrich)
- `GET/PATCH /api/books/[id]`
- `POST /api/books/[id]/enrich` — re-run enrichment
- `POST /api/books/[id]/photos` — mobile uploads
- `POST /api/books/[id]/publish` — mock Antikvaari

Data is stored in SQLite at `data/antikvaari-poc.db` (gitignored).

## Next step (real Antikvaari)

Replace `src/lib/antikvaari-mock.ts` with BookAPI client once you have login + Network/HAR capture or vendor docs.
