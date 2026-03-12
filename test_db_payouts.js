const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://indi_user:P5AHPr0eberZXjPXHNNtBNGhm3vzimxN@dpg-d5ll3em3jp1c739hqas0-a.oregon-postgres.render.com/indi',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const payouts = await pool.query("SELECT id, order_id, status FROM pending_payouts ORDER BY created_at DESC LIMIT 10;");
    console.log(JSON.stringify(payouts.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
