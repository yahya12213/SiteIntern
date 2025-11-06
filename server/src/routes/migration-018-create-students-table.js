const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Starting migration 018: Create students table...');

    // Create students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        cin TEXT UNIQUE NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        whatsapp TEXT,
        date_naissance DATE NOT NULL,
        lieu_naissance TEXT NOT NULL,
        adresse TEXT NOT NULL,
        statut_compte TEXT DEFAULT 'actif' CHECK (statut_compte IN ('actif', 'inactif', 'suspendu', 'diplome')),
        profile_image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Students table created');

    // Create index on CIN for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_students_cin ON students(cin)
    `);

    console.log('✓ Index on CIN created');

    await client.query('COMMIT');
    console.log('Migration 018 completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 018 failed:', error);
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
