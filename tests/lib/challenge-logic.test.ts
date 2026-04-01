import { describe, it, expect } from "vitest";

// Pure function version of the payout calculation to test logic
function calculatePayouts(bets: any[], winningSide: string) {
  const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const winningBets = bets.filter((bet) => bet.side === winningSide);
  const totalWinningStake = winningBets.reduce((sum, bet) => sum + bet.amount, 0);

  if (totalWinningStake === 0) return [];

  return winningBets.map((bet) => ({
    userId: bet.userId,
    payout: (bet.amount / totalWinningStake) * totalPool
  }));
}

describe("Challenge Payout Logic", () => {
  it("should distribute pool proportionally to winners in a 1v1 split", () => {
    const bets = [
      { userId: "user-a", side: "X", amount: 500 }, // Creator
      { userId: "user-b", side: "Y", amount: 200 }, // Friend 1 (split)
      { userId: "user-c", side: "Y", amount: 300 }, // Friend 2 (split)
    ];

    // Winner Side Y
    const payoutsY = calculatePayouts(bets, "Y");
    
    // Total pool is 1000. 
    // User B share: 200/500 = 40% of 1000 = 400
    // User C share: 300/500 = 60% of 1000 = 600
    
    expect(payoutsY).toHaveLength(2);
    expect(payoutsY.find(p => p.userId === "user-b")?.payout).toBe(400);
    expect(payoutsY.find(p => p.userId === "user-c")?.payout).toBe(600);

    // Winner Side X
    const payoutsX = calculatePayouts(bets, "X");
    // User A should get 1000
    expect(payoutsX).toHaveLength(1);
    expect(payoutsX[0].payout).toBe(1000);
  });

  it("should handle unbalanced pools (shifted odds)", () => {
    const bets = [
      { userId: "user-a", side: "X", amount: 1000 },
      { userId: "user-b", side: "Y", amount: 200 },
    ];

    const payoutsY = calculatePayouts(bets, "Y");
    // Total pool 1200. User B wins it all.
    expect(payoutsY[0].payout).toBe(1200);

    const payoutsX = calculatePayouts(bets, "X");
    // Total pool 1200. User A wins it all.
    expect(payoutsX[0].payout).toBe(1200);
  });
});
