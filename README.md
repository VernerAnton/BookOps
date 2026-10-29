# BookOps

BookOps is an internal tool for a bookstore that sells on [Antikvaari.fi](https://www.antikvaari.fi/). Adding a book today means looking up what other shops charge, deciding a price, finding a description and a cover, then typing the same thing into the merchant form. BookOps turns that into a queue: scan the ISBN, let the tool draft the listing, check it on one screen, and publish.

The name is the job. Book operations, with a bit of the “get it done” feel of a small ops team.

## Goal

The boss should be able to scan a barcode and move on. BookOps does the slow lookup. A person still decides condition, how many copies there are, where they sit in the shop, and the final price. Nothing goes live on Antikvaari until that person accepts the draft.

Success looks like this:

- A pile of books becomes a queue of ISBN scans, not an afternoon of tabs.
- Each draft already has a title, description, cover, and a suggested price grounded in what other Antikvaari sellers are asking, and in whether the book is still in print.
- Missing covers and blurbs become a phone task, not a dead end.
- The review screen shows the same kind of fields the merchant already knows from Antikvaari, so accepting a listing feels familiar.
- Accept sends that exact draft — text, price, and the chosen photo — to Antikvaari.

## The flow we want

```text
Scan ISBN
    → queue item
    → look up other Antikvaari listings (price and how many are for sale)
    → check whether the book is still in production
    → suggest a price from that market, with scarcity weighed more when it is out of print
    → find a description and a cover
    → if either is missing, send a phone task: photo of the cover and the back cover
    → read the blurb off the back-cover photo
    → one screen: queue on the left, the draft on the right
    → person sets condition, quantity, shelf or storage, and can edit title, text, and price
    → Accept
    → the approved snapshot is listed on Antikvaari with that photo
```

Each book in the queue is one listing intent, not just an ISBN. The same title can be scanned again later as another copy with a different condition or location.

Drafts live in BookOps. Antikvaari does not appear to offer a public “save as draft” for merchant listings, so half-finished work should not be pushed to the shop until Accept.

### What the person always owns

- Condition (Antikvaari’s K1–K5 scale).
- How many copies are for sale.
- Where they are: shop shelf, storage, and any note the staff needs.
- The final price. The suggestion is a range plus a recommendation, and it can be overwritten.

### What the tool owns until Accept

- Other sellers’ visible prices and how many copies are listed.
- Whether the book still seems to be in print, and how that shifts the suggestion.
- Title, author, description, and cover, from a book database first and from the web when that fails.
- A phone prompt when the cover or the blurb cannot be found.

### Publish

Antikvaari’s merchant tool is [BookAPI](https://bookapi.antikvaari.fi/) (login from the kauppiaspaneeli; there is also `dev-bookapi.antikvaari.fi`). There is no public API manual. The plan is:

1. Prefer BookAPI, or whatever structured submit the merchant account actually supports, including the image.
2. Use a browser agent only for the gaps: seeing the live Antikvaari search the way a buyer does, and filling a form field BookAPI cannot accept.
3. Publish from the approved snapshot. The publisher does not search again and does not change the price.

Internal notes (quantity on hand, storage location) stay in BookOps unless Antikvaari has a matching field.

## What this repository does today

This is a proof of concept. The desk workflow is real. Antikvaari itself is simulated.

| Step | Today |
|------|--------|
| Add an ISBN | Works from the top of the dashboard. Enrichment starts immediately. |
| One screen | Queue on the left. The selected book’s title, text, price, condition, cover, market note, quantity, and location are on the right. No separate review menu. |
| Description and cover | [Open Library](https://openlibrary.org/) when it has the ISBN. |
| Antikvaari prices and supply | Mocked from the ISBN, so the screen can show a lowest price, a count, and a suggestion. |
| In print or not | A stand-in flag used only to move the suggested price. |
| Missing cover or blurb | The same screen asks for a cover photo and a back-cover photo. There is also a phone page at `/mobile/task/[id]` for the shop floor. |
| Back-cover text | Simulated. A real vision step replaces this later. |
| Accept and publish | Mock BookAPI. The item is marked live and given a fake listing URL. The swap point is `src/lib/antikvaari-mock.ts`. |

Data is a local SQLite file, `data/bookops.db`, which is not committed.

## Plan

1. **Prove the desk loop.** Done in this repo: scan, queue, draft, one-screen review, phone fallback, mock publish.
2. **Replace the market mock.** Read live Antikvaari search results for that ISBN: lowest asks, how many copies, condition spread. Keep a browser agent here until there is a stable source.
3. **Replace the in-print guess.** Use a publisher or bookstore source, and show why the suggestion moved (“3 copies on Antikvaari from €12”, “out of print”).
4. **Real photos.** Store the cover the person approved. Read the blurb from the back-cover image instead of the placeholder sentence.
5. **Real publish.** Log into BookAPI once, capture how a listing and an image are submitted (or get Antikvaari’s own format), and send only the accepted snapshot. Test on `dev-bookapi` first if that environment does not create a public listing.
6. **Shop hardware.** A USB barcode scanner should be able to type into the ISBN field and submit. Same screen, no new menu.

Out of scope until the loop above is trustworthy: auto-publish without Accept, bulk edits of listings that are already live, and orders.

## Run it

```bash
npm install
npm run dev -- -p 43123
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Try `9780141036144`. An ISBN Open Library does not know tends to land on “needs a photo”.

### HTTP

- `GET /api/books` and `POST /api/books` with `{ "isbn": "..." }`
- `GET /api/books/[id]` and `PATCH /api/books/[id]`
- `POST /api/books/[id]/enrich`
- `POST /api/books/[id]/photos`
- `POST /api/books/[id]/publish` — mock Antikvaari

## Assumptions we still need to confirm with a merchant login

- Which BookAPI fields exist: price, condition, description, quantity, seller note, image upload.
- Whether submit is a web form, a file import, or an HTTP API.
- Whether `dev-bookapi` is safe for tests.
- That Antikvaari is fine with a shop tool submitting listings for that merchant account.

Cover images found on the web are a gray area the shop already treats as normal. The tool should remember where a cover came from, prefer a publisher or Open Library image, and let the phone photo override it.
