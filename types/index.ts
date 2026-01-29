export type MarketCategory = "Crypto" | "Finance" | "NFL" | "NBA" | "Cricket" | "Football" | "Politics" | "Election" | "World" | "Sports";
export type MarketTerm = "Ultra Short" | "Short" | "Long";

/** Metrics from B2B (wager response / WebSocket). Use percentage on card when present. */
export interface MarketMetrics {
  /** Yes outcome share (0–100). */
  yesPercent?: number;
  /** No outcome share (0–100). */
  noPercent?: number;
  /** Single percentage (e.g. yes share); noPercent = 100 - percentage. */
  percentage?: number;
}

export interface Market {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED" | "SETTLED";
  category?: MarketCategory;
  term?: MarketTerm;
  pool_yes: string;
  pool_no: string;
  total_pool: string;
  closure_timestamp: string | number;
  resolution_timestamp?: string | number;
  source_of_truth?: string;
  confidence_score?: string;
  image?: string;
  odds?: {
    yes: number;
    no: number;
  };
  /** B2B metrics (wager response / WebSocket). Use for percentage on card. */
  metrics?: MarketMetrics;
}

export interface WagerRequest {
  marketId: string;
  selection: "yes" | "no";
  stake: number;
}

export interface WagerResponse {
  status: string;
  wagerId: string;
  marketId: string;
  stake: number;
  selection: "yes" | "no";
  odds?: {
    yes: number;
    no: number;
  };
  /** B2B metrics (percentage etc.). Used on market card when present. */
  metrics?: MarketMetrics;
  /** Possible winning after platform commission. Prefer this over stake × odds in UI. */
  potentialWin?: number;
}

export interface ApiError {
  message: string;
  code?: number;
}

