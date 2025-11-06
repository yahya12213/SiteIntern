const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Starting migration 020: Update session_etudiants table...');

    // Add centre_id, classe_id, and numero_bon columns
    await client.query(`
      ALTER TABLE session_etudiants
      ADD COLUMN IF NOT EXISTS centre_id TEXT,
      ADD COLUMN IF NOT EXISTS classe_id TEXT,
      ADD COLUMN IF NOT EXISTS numero_bon TEXT
    `);

    console.log('✓ Columns added to session_etudiants table');

    await client.query('COMMIT');
    console.log('Migration 020 completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 020 failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
