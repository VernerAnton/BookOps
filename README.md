# BookOps

BookOps is a desk for a shop that lists used books on Antikvaari. Scan an ISBN, check the draft on one screen, and accept it before anything is treated as listed.

This repository is the visual mock of that desk. Market prices, print status, the back-cover read, and publish are sample data. Nothing is sent to Antikvaari.

## Run

```bash
npm install
npm run dev -- -p 43123
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

The sample queue includes `9780141036144`. An ISBN that is not in the sample catalog lands on “Needs photo”. The same ISBN can be scanned again as another copy. A USB scanner can type into the scan bay and submit with Enter.

Dark and light are both in the header.

## What the mock shows

- Queue on the left, the selected listing on the right.
- A sample Antikvaari note: how many copies, the lowest ask, and whether that sample is treated as in print.
- A suggested range, a recommendation, and the reason the number moved. The final price is still edited by hand.
- Condition K1–K5, quantity, and shelf or storage. Quantity and location stay marked as BookOps fields.
- A photo task on the same screen, plus a shop-floor page at `/mobile/task/[id]`.
- Accept marks that snapshot listed inside the mock and then locks it.

Reset sample in the header restores the four starter listings.
