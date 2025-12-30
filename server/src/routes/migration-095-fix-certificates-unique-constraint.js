/**
 * Migration 095: Fix certificates unique constraint
 *
 * Problem: The current UNIQUE constraint is on (student_id, formation_id, session_id, document_type)
 * This prevents having multiple templates with the same document_type for the same student.
 *
 * Solution: Change the constraint to use template_id instead of document_type
 * This allows multiple different templates (even with same document_type) for the same student.
 */

import pool from '../config/database.js';

export async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting Migration 095: Fix certificates unique constraint...');

    await client.query('BEGIN');

    // Step 1: Drop the old constraint
    console.log('\nStep 1: Dropping old UNIQUE constraint...');

    const oldConstraintCheck = await client.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'certificates'::regclass
      AND conname = 'certificates_unique_document'
    `);

    if (oldConstraintCheck.rows.length > 0) {
      await client.query(`
        ALTER TABLE certificates
        DROP CONSTRAINT certificates_unique_document
      `);
      console.log('✓ Old UNIQUE constraint dropped (student_id, formation_id, session_id, document_type)');
    } else {
      console.log('⚠ Old UNIQUE constraint does not exist, skipping drop');
    }

    // Step 2: Add new constraint with template_id
    console.log('\nStep 2: Adding new UNIQUE constraint with template_id...');

    const newConstraintCheck = await client.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'certificates'::regclass
      AND conname = 'certificates_unique_template'
    `);

    if (newConstraintCheck.rows.length === 0) {
      // First, handle any existing duplicates by keeping only the most recent one
      console.log('  Checking for duplicate entries...');

      const duplicatesCheck = await client.query(`
        SELECT student_id, formation_id, session_id, template_id, COUNT(*) as cnt
        FROM certificates
        WHERE template_id IS NOT NULL
        GROUP BY student_id, formation_id, session_id, template_id
        HAVING COUNT(*) > 1
      `);

      if (duplicatesCheck.rows.length > 0) {
        console.log(`  Found ${duplicatesCheck.rows.length} duplicate groups, cleaning up...`);

        // Delete duplicates, keeping the most recent one
        await client.query(`
          DELETE FROM certificates c1
          USING certificates c2
          WHERE c1.student_id = c2.student_id
            AND c1.formation_id = c2.formation_id
            AND (c1.session_id = c2.session_id OR (c1.session_id IS NULL AND c2.session_id IS NULL))
            AND c1.template_id = c2.template_id
            AND c1.template_id IS NOT NULL
            AND c1.created_at < c2.created_at
        `);

        console.log('  ✓ Duplicates cleaned up');
      }

      await client.query(`
        ALTER TABLE certificates
        ADD CONSTRAINT certificates_unique_template
        UNIQUE NULLS NOT DISTINCT (student_id, formation_id, session_id, template_id)
      `);
      console.log('✓ New UNIQUE constraint added (student_id, formation_id, session_id, template_id)');
    } else {
      console.log('⚠ New UNIQUE constraint already exists, skipping');
    }

    await client.query('COMMIT');

    console.log('\n✅ Migration 095 completed successfully!');
    console.log('   Certificates can now have multiple document_types per student/session');
    console.log('   Duplicates are prevented per template_id instead');

    return { success: true };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 095 failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Route handler for manual execution
export default async function handler(req, res) {
  try {
    const result = await runMigration();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
