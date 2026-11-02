export const CONDITIONS = ["K1", "K2", "K3", "K4", "K5"] as const;

export type Condition = (typeof CONDITIONS)[number];

export type BookStatus = "enriching" | "needs_photo" | "ready" | "live";

export type Market = {
  copies: number;
  lowest: number | null;
  conditionSpread: string;
  inPrint: boolean | null;
  printNote: string;
};

export type Suggestion = {
  low: number;
  high: number;
  recommend: number;
  reason: string;
};

export type Book = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string | null;
  coverSource: string | null;
  backCoverUrl: string | null;
  blurbSource: string | null;
  condition: Condition | null;
  quantity: number;
  location: string;
  price: string;
  market: Market | null;
  suggestion: Suggestion | null;
  status: BookStatus;
  listingNote: string | null;
  scannedAt: string;
};

export const MOCK_BLURB =
  "Mock read of the back cover. A real text read replaces this sentence. Edit it before Accept.";
