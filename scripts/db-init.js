const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL environment variable is not set.');
        process.exit(1);
    }

    console.log('🚀 Initializing database on Render...');

    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false // Required for Render's external connections if not using verified CA
        }
    });

    try {
        const sqlPath = path.join(__dirname, '../init-db.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🔧 Executing initialization script...');
        await pool.query(sql);
        console.log('✅ Database schema initialized successfully!');
    } catch (error) {
        console.error('❌ Database initialization failed:');
        console.error(error.message);
        if (error.detail) console.error('Detail:', error.detail);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

initializeDatabase();
