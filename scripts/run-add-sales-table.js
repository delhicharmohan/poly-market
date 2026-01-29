/**
 * Run this to add the sales table to an existing database.
 * Uses DATABASE_URL from env (or .env.local if present).
 *
 * From project root:
 *   node scripts/run-add-sales-table.js
 * Or with explicit URL:
 *   DATABASE_URL=postgresql://user:pass@host:port/db node scripts/run-add-sales-table.js
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env.local if it exists (simple parser, no dotenv dependency)
function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

loadEnvLocal();

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set. Set it in .env.local or pass it when running.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  const sqlPath = path.join(__dirname, "add-sales-table.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  try {
    console.log("Adding sales table...");
    await pool.query(sql);
    console.log("✅ Sales table created successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
