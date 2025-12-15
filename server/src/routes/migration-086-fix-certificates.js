import pool from '../db.js';

/**
 * Migration 086: Fix Critical Certificate Issues
 *
 * Problèmes corrigés:
 * 1. Contrainte UNIQUE incorrecte (student_id, formation_id) → empêche plusieurs types de documents
 * 2. Index manquants pour performance des queries
 * 3. Ajout CHECK constraint pour document_type
 *
 * Cette migration est CRITIQUE et doit être exécutée AVANT toute modification UI
 */

export const migrationInfo = {
  id: '086',
  name: 'fix-certificates-constraints',
  description: 'Fix UNIQUE constraint and add indexes for certificates table',
  date: '2025-12-15'
};

export async function up() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Migration 086: Starting...');

    // 1. Vérifier et supprimer l'ancienne contrainte UNIQUE si elle existe
    const constraintCheck = await client.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'certificates'::regclass
      AND conname = 'certificates_student_id_formation_id_key'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('Migration 086: Dropping old UNIQUE constraint...');
      await client.query(`
        ALTER TABLE certificates
        DROP CONSTRAINT certificates_student_id_formation_id_key
      `);
      console.log('Migration 086: Old constraint dropped');
    } else {
      console.log('Migration 086: Old constraint not found, skipping drop');
    }

    // 2. Ajouter la nouvelle contrainte UNIQUE correcte
    const newConstraintCheck = await client.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'certificates'::regclass
      AND conname = 'certificates_unique_document'
    `);

    if (newConstraintCheck.rows.length === 0) {
      console.log('Migration 086: Adding new UNIQUE constraint...');
      await client.query(`
        ALTER TABLE certificates
        ADD CONSTRAINT certificates_unique_document
        UNIQUE NULLS NOT DISTINCT (student_id, formation_id, session_id, document_type)
      `);
      console.log('Migration 086: New UNIQUE constraint added');
    } else {
      console.log('Migration 086: New UNIQUE constraint already exists, skipping');
    }

    // 3. Ajouter CHECK constraint pour document_type (si pas déjà présent)
    const checkConstraintExists = await client.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'certificates'::regclass
      AND conname = 'check_document_type'
    `);

    if (checkConstraintExists.rows.length === 0) {
      console.log('Migration 086: Adding CHECK constraint for document_type...');
      await client.query(`
        ALTER TABLE certificates
        ADD CONSTRAINT check_document_type
        CHECK (document_type IN ('certificat', 'attestation', 'badge'))
      `);
      console.log('Migration 086: CHECK constraint added');
    } else {
      console.log('Migration 086: CHECK constraint already exists, skipping');
    }

    // 4. Créer index sur session_id (si pas déjà présent)
    const sessionIdIndexExists = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'certificates'
      AND indexname = 'idx_certificates_session_id'
    `);

    if (sessionIdIndexExists.rows.length === 0) {
      console.log('Migration 086: Creating index on session_id...');
      await client.query(`
        CREATE INDEX idx_certificates_session_id
        ON certificates(session_id)
        WHERE session_id IS NOT NULL
      `);
      console.log('Migration 086: Index idx_certificates_session_id created');
    } else {
      console.log('Migration 086: Index idx_certificates_session_id already exists, skipping');
    }

    // 5. Créer index composite pour (session_id, document_type)
    const compositeIndexExists = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'certificates'
      AND indexname = 'idx_certificates_session_document'
    `);

    if (compositeIndexExists.rows.length === 0) {
      console.log('Migration 086: Creating composite index...');
      await client.query(`
        CREATE INDEX idx_certificates_session_document
        ON certificates(session_id, document_type)
        WHERE session_id IS NOT NULL
      `);
      console.log('Migration 086: Index idx_certificates_session_document created');
    } else {
      console.log('Migration 086: Index idx_certificates_session_document already exists, skipping');
    }

    // 6. Analyser la table pour mettre à jour les statistiques
    console.log('Migration 086: Analyzing table...');
    await client.query('ANALYZE certificates');

    await client.query('COMMIT');

    console.log('Migration 086: Completed successfully');

    return {
      success: true,
      message: 'Migration 086 completed: Fixed UNIQUE constraint and added indexes'
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 086: Failed', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Migration 086 Rollback: Starting...');

    // 1. Supprimer les index créés
    await client.query('DROP INDEX IF EXISTS idx_certificates_session_document');
    await client.query('DROP INDEX IF EXISTS idx_certificates_session_id');

    // 2. Supprimer la CHECK constraint
    await client.query(`
      ALTER TABLE certificates
      DROP CONSTRAINT IF EXISTS check_document_type
    `);

    // 3. Supprimer la nouvelle contrainte UNIQUE
    await client.query(`
      ALTER TABLE certificates
      DROP CONSTRAINT IF EXISTS certificates_unique_document
    `);

    // 4. Restaurer l'ancienne contrainte UNIQUE (attention: peut échouer si données incompatibles)
    // await client.query(`
    //   ALTER TABLE certificates
    //   ADD CONSTRAINT certificates_student_id_formation_id_key
    //   UNIQUE (student_id, formation_id)
    // `);

    await client.query('COMMIT');

    console.log('Migration 086 Rollback: Completed');

    return {
      success: true,
      message: 'Migration 086 rollback completed'
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 086 Rollback: Failed', error);
    throw error;
  } finally {
    client.release();
  }
}

// Fonction pour exécution directe
export default async function runMigration() {
  return await up();
}
