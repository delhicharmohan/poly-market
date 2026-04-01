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
  selection: string;
  stake: number;
}

export interface WagerResponse {
  status: string;
  wagerId: string;
  marketId: string;
  stake: number;
  selection: string;
  odds?: {
    yes: number;
    no: number;
  };
  /** B2B metrics (percentage etc.). Used on market card when present. */
  metrics?: MarketMetrics;
  /** Possible winning after platform commission. Prefer this over stake × odds in UI. */
  potentialWin?: number;
}

/// --- IPL Cricket Integration Types ---

export interface IplTournament {
  id: string;
  roanuz_key: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

export interface IplTeam {
  key: string;
  name: string;
  short_name: string;
}

export interface IplMatch {
  id: string;
  roanuz_key: string;
  match_number: number;
  team_a: IplTeam;
  team_b: IplTeam;
  venue: string;
  start_time: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "ABANDONED" | string;
  score: any[];
  micro_contests_enabled: boolean;
  toss?: any;
  result?: any;
  match_odds?: any;
}

export interface IplPreMatchContest {
  id: string;
  title: string;
  contest_type: "MATCH_WINNER" | "TOTAL_SIXES" | "RUNS_BRACKET" | string;
  status: string;
  pool_yes: string;
  pool_no: string;
  closure_timestamp: number;
  resolution_timestamp: number;
}

export interface IplMicroContest {
  id: string;
  market_id: string;
  over_number: number;
  innings: number;
  contest_type: "OVER_OUTCOME" | "OVER_RUNS" | string;
  status: string;
  title: string;
  pools: Record<string, number>;
  total_pool: string;
  opened_at?: string;
}

export interface ApiError {
  message: string;
  code?: number;
}

