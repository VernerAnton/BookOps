# BookOps plan

This is the direction for the product. Read it before adding screens, menus, or a new way to publish. The current code is a desk MVP on the way to this flow. It is not the finished operation.

BookOps is an internal tool for one bookstore that sells on [Antikvaari.fi](https://www.antikvaari.fi/). The slow job today is typing a book into the merchant form after looking up what other shops charge, whether the book is still in print, a description, and a cover. The boss should scan an ISBN and move on. A person still decides condition, how many copies there are, where they sit, and the final price. Nothing goes live until that person accepts.

## The operation

Each queue item is one listing, not one ISBN. The same title can be scanned again later as another copy with a different condition or shelf.

```text
Scan ISBN
    → queue
    → read Antikvaari: what other sellers ask, and how many copies are visible
    → decide if it still looks in production
    → suggest a price, and write down why it moved
    → find a description and a cover
    → if either is missing, ask for a photo of the front and the back
    → read the blurb off the back-cover photo
    → one screen: queue on the left, this book on the right
    → person sets condition, quantity, place in the shop, and can edit title, text, and price
    → Accept
    → freeze that exact snapshot
    → send that snapshot, including the chosen photo, to Antikvaari
```

Drafts live in BookOps. Antikvaari’s public help describes adding and updating products, not a merchant “save as draft”. Do not push a half-finished listing to the shop. Customer book-review drafts on Antikvaari are unrelated.

Accept means “list this, as written.” The publish step must not search again, must not pick a new photo, and must not change the price.

## Who decides what

The person at the desk always owns:

- Condition, on Antikvaari’s K1–K5 scale.
- How many copies are for sale.
- Where they are: shop shelf, storage, or a short note for the staff.
- The final price. The tool offers a range and a recommendation. Both can be overwritten.

The tool owns, until Accept:

- Other sellers’ visible prices and how many copies are listed.
- Whether the book still seems to be in print, and a sentence that says why the suggestion moved. Example: “3 copies on Antikvaari from €12, no new copies.”
- Title, author, description, and cover. Prefer a structured source. Searching the open web is the fallback.
- A phone task when the cover or the blurb cannot be found.

Quantity and shelf notes stay in BookOps unless Antikvaari has a matching field. Do not invent merchant-only data at publish time.

## Price

Start from the Antikvaari market, not from a memory of the publisher’s list price.

- Anchor on the lowest visible ask.
- If new copies are listed, the book still looks in production. Suggest slightly under that lowest ask.
- If only used copies are listed and very few of them, weigh scarcity and suggest above the lowest ask.
- If many used copies are listed, stay near the lowest ask.
- Show the reason next to the number. A single unexplained price is not enough.

“In production” should become a real check against a publisher or current bookstore source. Until that exists, “Antikvaari currently lists new copies” is the signal the desk uses. Say which signal was used.

## Text and pictures

Look up in this order:

1. The Antikvaari catalog page for that ISBN, when the ISBN actually matches.
2. A structured book record (Open Library, and later a Finnish library or publisher source).
3. The open web, only when the first two fail.

Covers copied from the web are a gray area the shop already treats as normal. Still record where the image came from. Prefer the publisher or Open Library. A photo taken in the shop overrides a downloaded cover.

When the cover or a usable description is missing, the same desk screen asks for a front photo and a back-cover photo. The phone page (`/mobile/task/[id]`) is for taking those pictures at the shelf. It is not a second app and not a second menu. After the back-cover photo exists, read the blurb from the image and put it in the description for the person to correct. Typed text remains the version that gets published.

## One screen

The desk is one view. ISBN field at the top. Queue on the left. The selected book on the right: title, author, description, price, condition, cover, the market note, quantity, and location. Status is a label on the row, not a set of filter menus. Do not add a separate review site, a settings maze, or a wizard.

Save and accept happen on that screen. A failed publish keeps the draft.

## Publishing to Antikvaari

Merchants add products through [BookAPI](https://bookapi.antikvaari.fi/), opened from the kauppiaspaneeli. There is also [dev-bookapi.antikvaari.fi](https://dev-bookapi.antikvaari.fi/). There is no public API manual. Unauthenticated visits only see a login gate. Treat a logged-in capture of one real add-product request, including the image, as the spec. Do not guess endpoints.

Order:

1. Send the accepted snapshot through BookAPI, or through whatever structured import Antikvaari confirms for this shop. Include the approved image.
2. Use a browser only for a gap BookAPI cannot fill, or to read the live search the way a buyer does when no stable data source exists.
3. Test on the dev host first if that does not create a public listing.
4. Store the real Antikvaari product id and URL when the create call returns them. A retry must not create a second listing.

Internal notes do not go to Antikvaari unless a real field exists for them.

What still has to be confirmed with a merchant login: which fields exist (price, condition, description, quantity, seller note, image), whether submit is a form, a file, or HTTP, and that the shop is allowed to submit from its own tool.

## Where it should run

Host on Cloudflare, as a private shop tool.

- **Workers** runs the app. For this Next.js codebase the target is Workers with vinext.
- **D1** stores the queue. It replaces the local SQLite file `data/bookops.db`.
- **R2** stores cover and back-cover photos. Do not keep those images inside the database.
- **Access** sits in front. Only the shop’s logins can open the site.

The screen does not change for that move. BookAPI credentials go in as secrets, not in the repo. Vercel is a poor fit: this app needs a private door, rows that survive a restart, and image files.

## What the repo already does

The desk loop is real. Antikvaari publish is not.

- Adding an ISBN enriches immediately. A scanner that types and presses Enter can use the field as it is.
- Antikvaari’s public catalog supplies the lowest price, copy count, seller count, and whether new copies are listed, when the ISBN matches.
- Description and cover fall back to Open Library.
- A missing cover or blurb opens photo inputs on the same screen, plus the phone page. The back-cover picture is stored. Reading the blurb off that picture is not built yet.
- Accept marks the draft approved and keeps the text and price. It does not create an Antikvaari listing.

## Build next, in this order

1. Keep this one screen. Do not split the queue, the review, and the photos into separate products.
2. Read the blurb from the back-cover image and drop it into the description for correction.
3. Confirm “in production” from a source beyond “new copies listed on Antikvaari”, and keep showing the reason.
4. Move storage to D1 and R2, and put Access in front, without changing the desk.
5. Capture one real BookAPI create, then send only the accepted snapshot. Test on the dev host first.
6. Leave the ISBN field ready for a USB scanner. No new screen.

Leave these alone until accept-then-publish is trustworthy: publishing without Accept, bulk edits of listings that are already live, and orders.

## Status names

`queued` → `enriching` → `needs_photo` or `ready_for_review` → `approved` → `publishing` → `live`

`failed` keeps the draft and can be retried. `approved` is the frozen snapshot. `live` means Antikvaari has the listing and BookOps has stored the real id and URL.
