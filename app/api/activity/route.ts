import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const pool = getPool();

        // 1. Get stats
        // Total Volume (Sum of all wallet transactions where type is wager or win - though wager is usually enough)
        // We use ABS(amount) for wager/withdraw to count volume
        const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT user_id) FROM wallet_transactions WHERE created_at > NOW() - INTERVAL '24 hours') as active_users,
        (SELECT COALESCE(SUM(ABS(amount)), 0) FROM wallet_transactions WHERE type IN ('withdraw', 'win') AND created_at > NOW() - INTERVAL '24 hours') as total_volume,
        (SELECT COUNT(*) FROM wagers WHERE created_at > NOW() - INTERVAL '24 hours') as live_trades
    `);

        // 2. Get recent activity
        // We fetch wagers and wins to show in the marquee
        const activityResult = await pool.query(`
      SELECT 
        wt.type,
        wt.amount,
        u.email,
        m.title as market_title,
        EXTRACT(EPOCH FROM wt.created_at) as timestamp
      FROM wallet_transactions wt
      JOIN users u ON wt.user_id = u.id
      LEFT JOIN wagers w ON wt.wager_id = w.id
      LEFT JOIN markets m ON w.market_id = m.id
      WHERE wt.type IN ('withdraw', 'win')
      ORDER BY wt.created_at DESC
      LIMIT 10
    `);

        const stats = {
            activeUsers: parseInt(statsResult.rows[0].active_users) || 0,
            totalVolume: parseFloat(statsResult.rows[0].total_volume) || 0,
            liveTrades: parseInt(statsResult.rows[0].live_trades) || 0,
        };

        const activities = activityResult.rows.map(row => {
            const email = row.email || "User";
            const username = email.split('@')[0];
            const anonymizedUser = username.length > 3 ? `${username.substring(0, 2)}***${username.slice(-1)}` : "***";

            let text = "";
            let type = "TRADE";

            if (row.type === 'win') {
                type = "WIN";
                text = `${anonymizedUser} won $${parseFloat(row.amount).toFixed(2)} on ${row.market_title || 'a market'}`;
            } else {
                text = `${anonymizedUser} placed $${Math.abs(parseFloat(row.amount)).toFixed(2)} on ${row.market_title || 'a market'}`;
            }

            return {
                type,
                text,
                timestamp: row.timestamp
            };
        });

        return NextResponse.json({ stats, activities });
    } catch (error: any) {
        console.error("Error fetching live activity:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
