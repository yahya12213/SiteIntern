/**
 * Migration 100: Add unique certificate_number to session_etudiants
 *
 * This migration:
 * 1. Adds certificate_number column to session_etudiants table
 * 2. Generates unique certificate numbers for existing enrollments
 * 3. Format: CERT-{SEGMENT_CODE}-{6 digits}
 *
 * The certificate number is generated ONCE when student is enrolled
 * and remains the same for ALL documents (attestation, badge, diploma, etc.)
 */

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * Generate a certificate number for a student enrollment
 * Format: CERT-{SEGMENT_CODE}-{6 digits}
 * Example: CERT-CASA-000001, CERT-RABAT-000042
 */
async function generateCertificateNumber(client, sessionId) {
  // Get the segment code for this session
  const segmentResult = await client.query(`
    SELECT s.id, s.name
    FROM sessions_formation sf
    JOIN segments s ON sf.segment_id = s.id
    WHERE sf.id = $1
  `, [sessionId]);

  let segmentCode = 'GEN'; // Default if no segment

  if (segmentResult.rows.length > 0) {
    // Create a short code from segment name (first 4 chars, uppercase)
    const segmentName = segmentResult.rows[0].name || 'GEN';
    segmentCode = segmentName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 4)
      .padEnd(4, 'X');
  }

  // Get the next sequence number for this segment
  // Count existing certificates with this segment prefix
  const countResult = await client.query(`
    SELECT COUNT(*) as count
    FROM session_etudiants
    WHERE certificate_number LIKE $1
  `, [`CERT-${segmentCode}-%`]);

  const nextNumber = (parseInt(countResult.rows[0].count) || 0) + 1;
  const paddedNumber = String(nextNumber).padStart(6, '0');

  return `CERT-${segmentCode}-${paddedNumber}`;
}

export async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('=== Migration 100: Add certificate_number to session_etudiants ===\n');

    // Step 1: Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'session_etudiants'
      AND column_name = 'certificate_number'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('Step 1: Adding certificate_number column...');
      await client.query(`
        ALTER TABLE session_etudiants
        ADD COLUMN certificate_number VARCHAR(30) UNIQUE
      `);
      console.log('✓ Column certificate_number added\n');
    } else {
      console.log('✓ Column certificate_number already exists\n');
    }

    // Step 2: Generate certificate numbers for existing enrollments without one
    console.log('Step 2: Generating certificate numbers for existing enrollments...\n');

    const enrollmentsResult = await client.query(`
      SELECT se.id, se.session_id, se.student_id, s.nom, s.prenom,
             sf.titre as session_titre, seg.name as segment_name
      FROM session_etudiants se
      JOIN students s ON se.student_id = s.id
      JOIN sessions_formation sf ON se.session_id = sf.id
      LEFT JOIN segments seg ON sf.segment_id = seg.id
      WHERE se.certificate_number IS NULL
      ORDER BY se.created_at ASC
    `);

    console.log(`Found ${enrollmentsResult.rows.length} enrollments without certificate number\n`);

    let generatedCount = 0;
    const generated = [];

    // Group by segment to generate sequential numbers
    const segmentCounts = {};

    for (const enrollment of enrollmentsResult.rows) {
      // Get segment code
      const segmentName = enrollment.segment_name || 'GEN';
      const segmentCode = segmentName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 4)
        .padEnd(4, 'X');

      // Initialize or increment count for this segment
      if (!segmentCounts[segmentCode]) {
        // Get existing count from database
        const existingCount = await client.query(`
          SELECT COUNT(*) as count
          FROM session_etudiants
          WHERE certificate_number LIKE $1
        `, [`CERT-${segmentCode}-%`]);
        segmentCounts[segmentCode] = parseInt(existingCount.rows[0].count) || 0;
      }

      segmentCounts[segmentCode]++;
      const nextNumber = segmentCounts[segmentCode];
      const paddedNumber = String(nextNumber).padStart(6, '0');
      const certificateNumber = `CERT-${segmentCode}-${paddedNumber}`;

      // Update the enrollment
      await client.query(`
        UPDATE session_etudiants
        SET certificate_number = $1
        WHERE id = $2
      `, [certificateNumber, enrollment.id]);

      generatedCount++;
      generated.push({
        student: `${enrollment.prenom} ${enrollment.nom}`,
        session: enrollment.session_titre,
        certificateNumber
      });

      console.log(`✓ ${enrollment.prenom} ${enrollment.nom} -> ${certificateNumber}`);
    }

    // Step 3: Update existing certificates to use the enrollment certificate_number
    console.log('\nStep 3: Updating existing certificates to match enrollment numbers...\n');

    const updateCertsResult = await client.query(`
      UPDATE certificates c
      SET certificate_number = se.certificate_number
      FROM session_etudiants se
      WHERE c.student_id = se.student_id
        AND c.session_id = se.session_id
        AND se.certificate_number IS NOT NULL
        AND c.certificate_number != se.certificate_number
      RETURNING c.id, c.certificate_number as new_number
    `);

    console.log(`✓ Updated ${updateCertsResult.rowCount} existing certificates\n`);

    await client.query('COMMIT');

    console.log('=== Migration 100 completed successfully! ===');
    console.log(`   Enrollments processed: ${enrollmentsResult.rows.length}`);
    console.log(`   Certificate numbers generated: ${generatedCount}`);
    console.log(`   Existing certificates updated: ${updateCertsResult.rowCount}`);

    return {
      success: true,
      message: `Generated ${generatedCount} certificate numbers`,
      enrollmentsProcessed: enrollmentsResult.rows.length,
      certificateNumbersGenerated: generatedCount,
      existingCertificatesUpdated: updateCertsResult.rowCount,
      samples: generated.slice(0, 10)
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 100 failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// POST endpoint
router.post('/', async (req, res) => {
  try {
    const result = await runMigration();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// /run endpoint for MigrationPanel
router.post('/run', async (req, res) => {
  try {
    const result = await runMigration();
    res.json({ success: true, details: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET endpoint - preview
router.get('/', async (req, res) => {
  try {
    // Preview without applying
    const enrollmentsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM session_etudiants
      WHERE certificate_number IS NULL
    `);

    const withNumberResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM session_etudiants
      WHERE certificate_number IS NOT NULL
    `);

    res.json({
      success: true,
      preview: true,
      enrollmentsWithoutNumber: parseInt(enrollmentsResult.rows[0].count),
      enrollmentsWithNumber: parseInt(withNumberResult.rows[0].count),
      message: `${enrollmentsResult.rows[0].count} enrollments need certificate numbers`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// /status endpoint
router.get('/status', async (req, res) => {
  try {
    // Check if column exists
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'session_etudiants'
      AND column_name = 'certificate_number'
    `);

    if (columnCheck.rows.length === 0) {
      return res.json({
        applied: false,
        status: { migrationNeeded: true },
        message: 'Migration 100 nécessaire - colonne certificate_number à créer'
      });
    }

    // Check if all enrollments have certificate numbers
    const nullCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM session_etudiants
      WHERE certificate_number IS NULL
    `);

    const hasNulls = parseInt(nullCount.rows[0].count) > 0;

    res.json({
      applied: !hasNulls,
      status: { migrationNeeded: hasNulls },
      message: hasNulls
        ? `Migration 100 nécessaire - ${nullCount.rows[0].count} inscriptions sans numéro`
        : 'Migration 100 appliquée - tous les étudiants ont un numéro de certificat'
    });
  } catch (error) {
    res.status(500).json({
      applied: false,
      status: { migrationNeeded: true },
      message: error.message
    });
  }
});

export { generateCertificateNumber };
export default router;
