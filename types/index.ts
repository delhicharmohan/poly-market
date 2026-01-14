export type MarketCategory = "Crypto" | "Finance" | "NFL" | "NBA" | "Cricket" | "Football" | "Politics" | "Election";
export type MarketTerm = "Ultra Short" | "Short" | "Long";

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
  odds?: {
    yes: number;
    no: number;
  };
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
  odds: {
    yes: number;
    no: number;
  };
}

export interface ApiError {
  message: string;
  code?: number;
}

