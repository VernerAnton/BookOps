# BookOps handoff

Give this folder to the agent that is connected to [github.com/VernerAnton/BookOps](https://github.com/VernerAnton/BookOps). That GitHub repository was empty when this package was made. Unzip over the repo root and push `main`. Do not create a second project.

The product name is **BookOps**. An earlier name, PageOps, was dropped.

## What the shop asked for

A bookstore lists used books on Antikvaari.fi. Adding a book by hand is the slow part. The boss scans an ISBN. BookOps should do the research, hold a draft, and publish only after a person accepts it.

Full intended flow:

1. Scan or type an ISBN. It enters a queue. One queue item is one listing, so the same ISBN can appear again as another copy.
2. Look up that ISBN on Antikvaari and record what other sellers ask, and how many copies are visible.
3. Check whether the book is still in print. If it is not, the price suggestion should lean on scarcity. Show why the number moved.
4. Find a description and a cover. Prefer a structured source (Open Library, publisher, library data). Searching the web is the fallback.
5. If the cover or the blurb is missing, raise a task on the phone: photograph the front cover and the back cover, then read the blurb from the back-cover photo.
6. One screen, not a set of menus. Queue on the left. The selected book on the right: title, author, description, price, condition (K1–K5), quantity, shelf or storage, cover, and the market note.
7. The person can edit anything. Condition, quantity, location, and the final price stay human decisions. The suggestion is a range plus a recommendation.
8. Accept publishes that exact snapshot to Antikvaari, including the approved photo. The publisher must not search again or change the price.

Drafts live in BookOps. Public Antikvaari help does not describe a merchant “save as draft” state. Do not push a half-finished listing.

## What was learned about Antikvaari

- Merchants add products through BookAPI: https://bookapi.antikvaari.fi/ — login from the kauppiaspaneeli. A dev host exists at https://dev-bookapi.antikvaari.fi/.
- There is no public OpenAPI or docs page. Unauthenticated visits only see “log in from the merchant panel.” `robots.txt` disallows crawling. Paths like `/docs` and `/swagger` are the same login screen.
- Customer help mentions saving a book *review* as a draft. That is not an inventory draft.
- Antikvaari’s own help text says a digital catalog can often be imported. Confirm fields with a logged-in merchant session: price, condition, description, quantity, seller note, image upload, and whether submit is a form, a file, or HTTP.
- Test on dev-bookapi first if that does not create a public listing.
- Prefer BookAPI for publish. Use a browser agent only to read the live Antikvaari search (competitor prices) and for form fields the API cannot fill.
- Cover images taken from the web are a gray area the shop already accepts. Store the source. Prefer Open Library or the publisher. A photo taken in the shop overrides it.

## What this code already does

Next.js, TypeScript, Tailwind. Local SQLite at `data/bookops.db` (gitignored).

| Piece | Status |
|-------|--------|
| Dashboard | One screen. ISBN field in the header. Queue on the left. Selected book on the right. |
| Enrichment | Open Library title, author, description, and cover. Runs when an ISBN is added. |
| Market and in-print | Mocked in `src/lib/enrichment.ts` so the UI can show a lowest price, a count, and a suggestion. |
| Missing cover or text | Inline camera inputs on the same screen, plus `/mobile/task/[id]` for the shop floor. |
| Back-cover OCR | Placeholder sentence in `mockExtractDescriptionFromPhotos`. |
| Publish | Mock in `src/lib/antikvaari-mock.ts`. Sets status `live` and a fake listing URL. This is the file to replace. |

Run with `npm install` then `npm run dev -- -p 43123`. Sample ISBN: `9780141036144`. An unknown ISBN should land on “needs a photo.”

## What to build next, in order

1. Keep this UI. Do not split review, queue, and photos into separate menus again.
2. Replace the market mock with a real Antikvaari ISBN search (prices, count, conditions).
3. Replace the in-print guess and show the reason next to the suggested price.
4. Read the blurb from the back-cover image.
5. Replace `src/lib/antikvaari-mock.ts` with a BookAPI client that sends only the accepted snapshot. Capture a real add-product request from the merchant panel (a HAR file) before guessing endpoints.
6. A USB barcode scanner should be able to type into the ISBN field and submit. No new screen.

Leave auto-publish, bulk edits of live listings, and order handling alone until Accept-then-publish is trustworthy.

## Files worth reading first

- `README.md` — goal, flow, and plan in product language.
- `src/components/queue-dashboard.tsx` — the only desk screen.
- `src/lib/enrichment-job.ts` — queue statuses after a scan.
- `src/lib/antikvaari-mock.ts` — the publish seam.
- `src/app/api/books/` — list, update, enrich, photos, publish.

## Prompt you can paste with this folder

BookOps is a bookstore tool for listing books on Antikvaari.fi. This folder is the proof of concept: one-screen ISBN queue, Open Library enrichment, mocked Antikvaari prices, a phone photo fallback, and a mocked publish. Read HANDOFF.md and README.md. Put this code in the BookOps repo. Do not redesign the dashboard into multiple menus. Next real work is live Antikvaari market data and replacing `src/lib/antikvaari-mock.ts` once we have a BookAPI capture from the merchant login.
