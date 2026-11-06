export type BookStatus =
  | "queued"
  | "enriching"
  | "needs_photo"
  | "ready_for_review"
  | "approved"
  | "publishing"
  | "live"
  | "failed";

export type ConditionGrade = "K1" | "K2" | "K3" | "K4" | "K5";

export interface MarketListing {
  seller: string;
  price: number;
  condition: ConditionGrade;
}

export interface MarketSnapshot {
  listingCount: number;
  lowestPrice: number | null;
  highestPrice: number | null;
  listings: MarketListing[];
  searchedAt: string;
  catalogUrl: string | null;
  newItemCount: number;
  usedItemCount: number;
  sellerCount: number;
  reason: string;
}

export interface BookRecord {
  id: string;
  isbn: string;
  status: BookStatus;
  title: string | null;
  author: string | null;
  description: string | null;
  suggestedPriceMin: number | null;
  suggestedPriceMax: number | null;
  price: number | null;
  condition: ConditionGrade | null;
  internalQty: number;
  internalLocation: string | null;
  internalNotes: string | null;
  coverUrl: string | null;
  coverSource: string | null;
  backCoverUrl: string | null;
  inPrint: boolean | null;
  market: MarketSnapshot | null;
  antikvaariListingId: string | null;
  antikvaariListingUrl: string | null;
  mobileTaskToken: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookInput {
  isbn: string;
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  description?: string;
  price?: number | null;
  condition?: ConditionGrade;
  internalQty?: number;
  internalLocation?: string;
  internalNotes?: string;
  status?: BookStatus;
}
