const { Pool } = require('pg');

async function migrate() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL environment variable is not set.');
        process.exit(1);
    }

    console.log('🚀 Running Challenge feature migration...');

    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔧 Creating challenges and challenge_bets tables...');
        
        await pool.query(`
            -- Create challenge status enum if it doesn't exist
            DO $$ BEGIN
                CREATE TYPE challenge_status AS ENUM ('PENDING', 'ACTIVE', 'CLOSED', 'SETTLED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            -- Challenges table
            CREATE TABLE IF NOT EXISTS challenges (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
                topic TEXT NOT NULL,
                outcome_x TEXT NOT NULL,
                outcome_y TEXT NOT NULL,
                status challenge_status DEFAULT 'PENDING',
                target_stake DECIMAL(20, 2) NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Challenge bets table
            CREATE TABLE IF NOT EXISTS challenge_bets (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                side CHAR(1) NOT NULL CHECK (side IN ('X', 'Y')),
                amount DECIMAL(20, 2) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_challenges_creator_id ON challenges(creator_id);
            CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
            CREATE INDEX IF NOT EXISTS idx_challenge_bets_challenge_id ON challenge_bets(challenge_id);
            CREATE INDEX IF NOT EXISTS idx_challenge_bets_user_id ON challenge_bets(user_id);

            -- Trigger for updated_at
            DROP TRIGGER IF EXISTS update_challenges_updated_at ON challenges;
            CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

        console.log('✅ Migration successful!');
    } catch (error) {
        console.error('❌ Migration failed:');
        console.error(error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
