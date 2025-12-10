import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting Migration 084: Archive System...');

    await client.query('BEGIN');

    // Migration 1: Add columns to certificates table
    console.log('Adding columns to certificates table...');

    // Check if columns already exist before adding
    const checkSessionId = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'certificates' AND column_name = 'session_id'
    `);

    if (checkSessionId.rows.length === 0) {
      await client.query(`
        ALTER TABLE certificates
        ADD COLUMN session_id TEXT REFERENCES sessions_formation(id) ON DELETE SET NULL
      `);
      console.log('✓ Added session_id column');
    } else {
      console.log('⚠ session_id column already exists, skipping');
    }

    const checkFilePath = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'certificates' AND column_name = 'file_path'
    `);

    if (checkFilePath.rows.length === 0) {
      await client.query(`
        ALTER TABLE certificates
        ADD COLUMN file_path TEXT
      `);
      console.log('✓ Added file_path column');
    } else {
      console.log('⚠ file_path column already exists, skipping');
    }

    const checkArchiveFolder = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'certificates' AND column_name = 'archive_folder'
    `);

    if (checkArchiveFolder.rows.length === 0) {
      await client.query(`
        ALTER TABLE certificates
        ADD COLUMN archive_folder TEXT
      `);
      console.log('✓ Added archive_folder column');
    } else {
      console.log('⚠ archive_folder column already exists, skipping');
    }

    // Create indexes
    console.log('Creating indexes...');

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_certificates_session_id ON certificates(session_id)
      `);
      console.log('✓ Created index on session_id');
    } catch (error) {
      console.log('⚠ Index idx_certificates_session_id may already exist');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_certificates_file_path ON certificates(file_path)
      `);
      console.log('✓ Created index on file_path');
    } catch (error) {
      console.log('⚠ Index idx_certificates_file_path may already exist');
    }

    // Migration 2: Create archive_folders table
    console.log('Creating archive_folders table...');

    const checkArchiveFoldersTable = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'archive_folders'
    `);

    if (checkArchiveFoldersTable.rows.length === 0) {
      await client.query(`
        CREATE TABLE archive_folders (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES sessions_formation(id) ON DELETE CASCADE,
          folder_path TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Created archive_folders table');
    } else {
      console.log('⚠ archive_folders table already exists, skipping');
    }

    // Create index for archive_folders
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_archive_folders_session ON archive_folders(session_id)
      `);
      console.log('✓ Created index on archive_folders.session_id');
    } catch (error) {
      console.log('⚠ Index idx_archive_folders_session may already exist');
    }

    // Migration 3: Create student_archive_folders table
    console.log('Creating student_archive_folders table...');

    const checkStudentArchiveFoldersTable = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'student_archive_folders'
    `);

    if (checkStudentArchiveFoldersTable.rows.length === 0) {
      await client.query(`
        CREATE TABLE student_archive_folders (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES sessions_formation(id) ON DELETE CASCADE,
          student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          folder_path TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(session_id, student_id)
        )
      `);
      console.log('✓ Created student_archive_folders table');
    } else {
      console.log('⚠ student_archive_folders table already exists, skipping');
    }

    // Create indexes for student_archive_folders
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_student_archive_session ON student_archive_folders(session_id)
      `);
      console.log('✓ Created index on student_archive_folders.session_id');
    } catch (error) {
      console.log('⚠ Index idx_student_archive_session may already exist');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_student_archive_student ON student_archive_folders(student_id)
      `);
      console.log('✓ Created index on student_archive_folders.student_id');
    } catch (error) {
      console.log('⚠ Index idx_student_archive_student may already exist');
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration 084 completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 084 failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export default runMigration;
