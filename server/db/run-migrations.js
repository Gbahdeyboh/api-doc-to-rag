/**
 * Combined script to run database setup and migrations
 * This script:
 * 1. Sets up pgvector extension
 * 2. Runs all database migrations
 *
 * Used for one-time migrations
 */
import { env } from '../env.mjs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runAllMigrations = async () => {
    if (!env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }

    const connection = postgres(env.DATABASE_URL, { max: 1 });

    try {
        console.log('🚀 Starting database setup and migrations...\n');

        // Step 1: Setup pgvector extension
        console.log('⏳ Step 1: Checking pgvector extension...');

        const result = await connection`
            SELECT * FROM pg_available_extensions WHERE name = 'vector';
        `;

        if (result.length === 0) {
            console.log('❌ pgvector extension is NOT installed on your PostgreSQL server.');
            console.log('\n⚠️ PostgreSQL may need pgvector enabled.');
            console.log('Please check PostgreSQL documentation or contact support.');
            process.exit(1);
        }

        console.log('✅ pgvector extension is available');

        // Try to enable it
        console.log('⏳ Enabling pgvector extension...');
        try {
            await connection`CREATE EXTENSION IF NOT EXISTS vector;`;
            console.log('✅ pgvector extension enabled successfully!');
        } catch (err) {
            if (err.code === '42501') {
                console.log(
                    '⚠️  Permission denied. Extension may already be enabled or needs admin privileges.'
                );
                console.log('Continuing with migrations...');
            } else {
                throw err;
            }
        }

        // Verify it's enabled
        const enabled = await connection`
            SELECT * FROM pg_extension WHERE extname = 'vector';
        `;

        if (enabled.length > 0) {
            console.log('✅ Vector extension is active and ready to use!\n');
        }

        // Step 2: Run migrations
        console.log('⏳ Step 2: Running database migrations...');

        const db = drizzle(connection);
        const migrationsFolder = path.join(__dirname, 'migrations');

        const start = Date.now();
        await migrate(db, { migrationsFolder });
        const end = Date.now();

        console.log(`✅ Migrations completed in ${end - start}ms\n`);
        console.log('🎉 Database setup and migrations completed successfully!');

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:');
        console.error(err.message);
        if (err.stack) {
            console.error(err.stack);
        }
        process.exit(1);
    } finally {
        await connection.end();
    }
};

runAllMigrations();
