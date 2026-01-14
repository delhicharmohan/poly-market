#!/usr/bin/env node

/**
 * Verification script to check if market settlements are working correctly
 * Usage: node scripts/verify-settlements.js
 */

const { Pool } = require('pg');

// Get database connection from environment
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.POSTGRES_USER || "indimarket"}:${process.env.POSTGRES_PASSWORD || "indimarket123"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5434"}/${process.env.POSTGRES_DB || "indimarket"}`;

const pool = new Pool({ connectionString });

async function verifySettlements() {
  console.log('🔍 Verifying Market Settlements\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Check settled markets
    console.log('\n1️⃣ SETTLED MARKETS:');
    console.log('-'.repeat(60));
    const settledMarkets = await pool.query(`
      SELECT 
        id,
        title,
        status,
        resolution_timestamp,
        updated_at
      FROM markets
      WHERE status = 'SETTLED'
      ORDER BY resolution_timestamp DESC
      LIMIT 10
    `);
    
    if (settledMarkets.rows.length === 0) {
      console.log('❌ No settled markets found');
      console.log('   → This means either:');
      console.log('     - No webhooks have been received yet');
      console.log('     - Markets haven\'t been settled by the provider');
    } else {
      console.log(`✅ Found ${settledMarkets.rows.length} settled market(s):\n`);
      settledMarkets.rows.forEach((market, idx) => {
        console.log(`   ${idx + 1}. ${market.title}`);
        console.log(`      Market ID: ${market.id}`);
        console.log(`      Status: ${market.status}`);
        console.log(`      Settled at: ${market.resolution_timestamp ? new Date(market.resolution_timestamp).toLocaleString() : 'N/A'}`);
        console.log(`      Updated at: ${new Date(market.updated_at).toLocaleString()}\n`);
      });
    }

    // 2. Check wagers for settled markets
    console.log('\n2️⃣ WAGERS IN SETTLED MARKETS:');
    console.log('-'.repeat(60));
    const settledWagers = await pool.query(`
      SELECT 
        w.id,
        w.wager_id,
        w.market_id,
        w.selection,
        w.stake,
        w.potential_win,
        w.actual_payout,
        w.status,
        w.market_status,
        m.title as market_title,
        u.email as user_email
      FROM wagers w
      JOIN markets m ON w.market_id = m.id
      LEFT JOIN users u ON w.user_id = u.id
      WHERE m.status = 'SETTLED'
      ORDER BY w.created_at DESC
      LIMIT 20
    `);
    
    if (settledWagers.rows.length === 0) {
      console.log('❌ No wagers found in settled markets');
    } else {
      console.log(`✅ Found ${settledWagers.rows.length} wager(s) in settled markets:\n`);
      
      const wonCount = settledWagers.rows.filter(w => w.status === 'WON').length;
      const lostCount = settledWagers.rows.filter(w => w.status === 'LOST').length;
      const pendingCount = settledWagers.rows.filter(w => w.status !== 'WON' && w.status !== 'LOST').length;
      
      console.log(`   Summary: ${wonCount} WON, ${lostCount} LOST, ${pendingCount} PENDING\n`);
      
      settledWagers.rows.forEach((wager, idx) => {
        const statusIcon = wager.status === 'WON' ? '✅' : wager.status === 'LOST' ? '❌' : '⏳';
        console.log(`   ${idx + 1}. ${statusIcon} ${wager.market_title}`);
        console.log(`      Wager ID: ${wager.wager_id}`);
        console.log(`      User: ${wager.user_email || 'N/A'}`);
        console.log(`      Selection: ${wager.selection.toUpperCase()}`);
        console.log(`      Stake: $${parseFloat(wager.stake).toFixed(2)}`);
        console.log(`      Status: ${wager.status}`);
        console.log(`      Potential Win: $${parseFloat(wager.potential_win).toFixed(2)}`);
        if (wager.actual_payout !== null) {
          console.log(`      Actual Payout: $${parseFloat(wager.actual_payout).toFixed(2)}`);
        } else if (wager.status === 'WON') {
          console.log(`      ⚠️  Actual Payout: NULL (should be set for winning wagers)`);
        }
        console.log('');
      });
    }

    // 3. Check wallet transactions for winnings
    console.log('\n3️⃣ WINNING TRANSACTIONS:');
    console.log('-'.repeat(60));
    const winningTransactions = await pool.query(`
      SELECT 
        wt.id,
        wt.type,
        wt.amount,
        wt.balance_after,
        wt.description,
        wt.created_at,
        u.email as user_email,
        w.wager_id,
        m.title as market_title
      FROM wallet_transactions wt
      JOIN users u ON wt.user_id = u.id
      LEFT JOIN wagers w ON wt.wager_id = w.id
      LEFT JOIN markets m ON w.market_id = m.id
      WHERE wt.type = 'win'
      ORDER BY wt.created_at DESC
      LIMIT 20
    `);
    
    if (winningTransactions.rows.length === 0) {
      console.log('❌ No winning transactions found');
      console.log('   → This means either:');
      console.log('     - No wagers have won yet');
      console.log('     - Winnings haven\'t been credited to wallets');
    } else {
      console.log(`✅ Found ${winningTransactions.rows.length} winning transaction(s):\n`);
      
      const totalWinnings = winningTransactions.rows.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      console.log(`   Total winnings credited: $${totalWinnings.toFixed(2)}\n`);
      
      winningTransactions.rows.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. ${tx.market_title || 'Unknown Market'}`);
        console.log(`      User: ${tx.user_email}`);
        console.log(`      Amount: $${parseFloat(tx.amount).toFixed(2)}`);
        console.log(`      Balance After: $${parseFloat(tx.balance_after).toFixed(2)}`);
        console.log(`      Wager ID: ${tx.wager_id || 'N/A'}`);
        console.log(`      Credited at: ${new Date(tx.created_at).toLocaleString()}\n`);
      });
    }

    // 4. Check for issues
    console.log('\n4️⃣ POTENTIAL ISSUES:');
    console.log('-'.repeat(60));
    
    // Check for WON wagers without payout
    const wonWithoutPayout = await pool.query(`
      SELECT COUNT(*) as count
      FROM wagers
      WHERE status = 'WON' AND (actual_payout IS NULL OR actual_payout = 0)
    `);
    
    if (parseInt(wonWithoutPayout.rows[0].count) > 0) {
      console.log(`⚠️  Found ${wonWithoutPayout.rows[0].count} WON wager(s) without payout`);
    } else {
      console.log('✅ All WON wagers have payouts set');
    }
    
    // Check for WON wagers without wallet transactions
    const wonWithoutWalletTx = await pool.query(`
      SELECT COUNT(*) as count
      FROM wagers w
      WHERE w.status = 'WON' 
        AND w.actual_payout > 0
        AND NOT EXISTS (
          SELECT 1 FROM wallet_transactions wt 
          WHERE wt.wager_id = w.id AND wt.type = 'win'
        )
    `);
    
    if (parseInt(wonWithoutWalletTx.rows[0].count) > 0) {
      console.log(`⚠️  Found ${wonWithoutWalletTx.rows[0].count} WON wager(s) without wallet transactions`);
    } else {
      console.log('✅ All WON wagers have wallet transactions');
    }
    
    // Check for settled markets with pending wagers
    const pendingInSettled = await pool.query(`
      SELECT COUNT(*) as count
      FROM wagers w
      JOIN markets m ON w.market_id = m.id
      WHERE m.status = 'SETTLED' 
        AND w.status NOT IN ('WON', 'LOST')
    `);
    
    if (parseInt(pendingInSettled.rows[0].count) > 0) {
      console.log(`⚠️  Found ${pendingInSettled.rows[0].count} wager(s) still PENDING in settled markets`);
    } else {
      console.log('✅ All wagers in settled markets are marked WON or LOST');
    }

    // 5. Summary statistics
    console.log('\n5️⃣ SUMMARY STATISTICS:');
    console.log('-'.repeat(60));
    
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM markets WHERE status = 'SETTLED') as settled_markets,
        (SELECT COUNT(*) FROM wagers WHERE status = 'WON') as won_wagers,
        (SELECT COUNT(*) FROM wagers WHERE status = 'LOST') as lost_wagers,
        (SELECT COALESCE(SUM(actual_payout), 0) FROM wagers WHERE status = 'WON') as total_payouts,
        (SELECT COUNT(*) FROM wallet_transactions WHERE type = 'win') as winning_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE type = 'win') as total_winnings_credited
    `);
    
    const s = stats.rows[0];
    console.log(`   Settled Markets: ${s.settled_markets}`);
    console.log(`   Won Wagers: ${s.won_wagers}`);
    console.log(`   Lost Wagers: ${s.lost_wagers}`);
    console.log(`   Total Payouts: $${parseFloat(s.total_payouts).toFixed(2)}`);
    console.log(`   Winning Transactions: ${s.winning_transactions}`);
    console.log(`   Total Winnings Credited: $${parseFloat(s.total_winnings_credited).toFixed(2)}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete!\n');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifySettlements();


