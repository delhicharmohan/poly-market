import { Pool, QueryResult } from "pg";

// Database connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 
      `postgresql://${process.env.POSTGRES_USER || "indimarket"}:${process.env.POSTGRES_PASSWORD || "indimarket123"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DB || "indimarket"}`;


    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased timeout
    });

    // Handle pool errors
    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        detail: err.detail,
      });
    });

    // Test connection on first use
    pool.query("SELECT 1")
      .then(() => {
      })
      .catch((err) => {
        console.error("❌ Initial database connection test failed:", err.message);
        console.error("Connection error details:", {
          code: err.code,
          detail: err.detail,
          hint: err.hint,
        });
      });
  }

  return pool;
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT NOW()");
    return !!result.rows[0];
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

// Close database connection (useful for cleanup)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

