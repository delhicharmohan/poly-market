import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MarketCard from "@/components/MarketCard";
import { Market } from "@/types";

// Mock lucide-react Clock icon
vi.mock("lucide-react", () => ({
  Clock: (props: any) => <svg data-testid="clock-icon" {...props} />,
}));

// Mock image helper
vi.mock("@/lib/images", () => ({
  getMarketImage: () => "/test-image.jpg",
}));

function makeMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: "market-1",
    title: "Will BTC hit $100k?",
    status: "OPEN",
    category: "Crypto",
    pool_yes: "5000",
    pool_no: "3000",
    total_pool: "8000",
    closure_timestamp: (Date.now() + 48 * 60 * 60 * 1000).toString(), // 48h from now
    ...overrides,
  };
}

describe("MarketCard", () => {
  it("renders market title", () => {
    render(<MarketCard market={makeMarket()} onPlaceWager={vi.fn()} />);
    expect(screen.getByText("Will BTC hit $100k?")).toBeInTheDocument();
  });

  it("renders category tag", () => {
    render(<MarketCard market={makeMarket({ category: "Crypto" })} onPlaceWager={vi.fn()} />);
    expect(screen.getByText("Crypto")).toBeInTheDocument();
  });

  it("shows LIVE badge when market is OPEN", () => {
    render(<MarketCard market={makeMarket({ status: "OPEN" })} onPlaceWager={vi.fn()} />);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("does not show LIVE badge when market is CLOSED", () => {
    render(<MarketCard market={makeMarket({ status: "CLOSED" })} onPlaceWager={vi.fn()} />);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  it("does not show LIVE badge when market is SETTLED", () => {
    render(<MarketCard market={makeMarket({ status: "SETTLED" })} onPlaceWager={vi.fn()} />);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  it("renders BUY YES and BUY NO buttons", () => {
    render(<MarketCard market={makeMarket()} onPlaceWager={vi.fn()} />);
    expect(screen.getByText("BUY YES")).toBeInTheDocument();
    expect(screen.getByText("BUY NO")).toBeInTheDocument();
  });

  it("calls onPlaceWager('yes') when YES button is clicked", () => {
    const onPlaceWager = vi.fn();
    render(<MarketCard market={makeMarket()} onPlaceWager={onPlaceWager} />);
    fireEvent.click(screen.getByText("BUY YES").closest("button")!);
    expect(onPlaceWager).toHaveBeenCalledWith("yes");
  });

  it("calls onPlaceWager('no') when NO button is clicked", () => {
    const onPlaceWager = vi.fn();
    render(<MarketCard market={makeMarket()} onPlaceWager={onPlaceWager} />);
    fireEvent.click(screen.getByText("BUY NO").closest("button")!);
    expect(onPlaceWager).toHaveBeenCalledWith("no");
  });

  it("disables buttons when market is CLOSED", () => {
    const onPlaceWager = vi.fn();
    render(<MarketCard market={makeMarket({ status: "CLOSED" })} onPlaceWager={onPlaceWager} />);
    const yesBtn = screen.getByText("BUY YES").closest("button")!;
    const noBtn = screen.getByText("BUY NO").closest("button")!;
    expect(yesBtn).toBeDisabled();
    expect(noBtn).toBeDisabled();
  });

  it("does not call onPlaceWager when market is CLOSED and button is clicked", () => {
    const onPlaceWager = vi.fn();
    render(<MarketCard market={makeMarket({ status: "CLOSED" })} onPlaceWager={onPlaceWager} />);
    fireEvent.click(screen.getByText("BUY YES").closest("button")!);
    expect(onPlaceWager).not.toHaveBeenCalled();
  });

  it("displays total pool volume", () => {
    render(<MarketCard market={makeMarket({ total_pool: "15000" })} onPlaceWager={vi.fn()} />);
    expect(screen.getByText(/Vol: \$15,000/)).toBeInTheDocument();
  });

  it("calculates odds from pools when no explicit odds provided", () => {
    // pool_yes = 5000, pool_no = 3000, total = 8000
    // oddsYes = 8000/5000 = 1.60, oddsNo = 8000/3000 = 2.67
    render(<MarketCard market={makeMarket()} onPlaceWager={vi.fn()} />);
    expect(screen.getByText("1.60")).toBeInTheDocument();
    expect(screen.getByText("2.67")).toBeInTheDocument();
  });

  it("uses explicit odds when provided", () => {
    const market = makeMarket({ odds: { yes: 1.25, no: 3.00 } });
    render(<MarketCard market={market} onPlaceWager={vi.fn()} />);
    expect(screen.getByText("1.25")).toBeInTheDocument();
    expect(screen.getByText("3.00")).toBeInTheDocument();
  });

  it("displays B2B metrics percentages when available", () => {
    const market = makeMarket({
      metrics: { yesPercent: 72, noPercent: 28 },
    });
    render(<MarketCard market={market} onPlaceWager={vi.fn()} />);
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("28%")).toBeInTheDocument();
  });

  it("derives percentages from pools when no metrics provided", () => {
    // pool_yes = 5000, pool_no = 3000 → 62.5% / 37.5%
    render(<MarketCard market={makeMarket()} onPlaceWager={vi.fn()} />);
    expect(screen.getByText("63%")).toBeInTheDocument(); // rounded
    expect(screen.getByText("38%")).toBeInTheDocument(); // rounded
  });

  it("shows 50/50 when total pool is 0", () => {
    const market = makeMarket({ pool_yes: "0", pool_no: "0", total_pool: "0" });
    render(<MarketCard market={market} onPlaceWager={vi.fn()} />);
    const percentTexts = screen.getAllByText("50%");
    expect(percentTexts).toHaveLength(2); // both YES and NO show 50%
  });

  it("shows Closed when closure timestamp is in the past", () => {
    const market = makeMarket({
      closure_timestamp: (Date.now() - 1000).toString(),
      status: "CLOSED",
    });
    render(<MarketCard market={market} onPlaceWager={vi.fn()} />);
    // The countdown span should show "Closed"
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("handles numeric closure_timestamp", () => {
    const market = makeMarket({
      closure_timestamp: Date.now() + 3600000, // number, not string
    });
    render(<MarketCard market={market} onPlaceWager={vi.fn()} />);
    // Should show a countdown, not "Closed"
    expect(screen.queryByText("Closed")).not.toBeInTheDocument();
  });
});
