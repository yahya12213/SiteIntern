/**
 * Migration 114: Add missing certificats permissions
 *
 * The backend routes use training.certificates.* which converts to formation.certificats.*
 * but these permissions were missing from the database.
 *
 * FIXED: Uses simple permissions table structure (no modules/submenus tables)
 */

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/run', authenticateToken, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🚀 Migration 114: Adding certificats permissions...');

    // Define the certificats permissions to add
    // Using simple permissions table structure: code, name, module, description
    const certificatsPermissions = [
      {
        code: 'formation.certificats.voir',
        name: 'Voir les certificats',
        module: 'formation',
        description: 'Permet de voir les certificats generes'
      },
      {
        code: 'formation.certificats.generer',
        name: 'Generer un certificat',
        module: 'formation',
        description: 'Permet de generer un nouveau certificat pour un etudiant'
      },
      {
        code: 'formation.certificats.modifier',
        name: 'Modifier un certificat',
        module: 'formation',
        description: 'Permet de modifier un certificat existant'
      },
      {
        code: 'formation.certificats.supprimer',
        name: 'Supprimer un certificat',
        module: 'formation',
        description: 'Permet de supprimer un certificat'
      },
      {
        code: 'formation.certificats.telecharger',
        name: 'Telecharger un certificat',
        module: 'formation',
        description: 'Permet de telecharger un certificat en PDF'
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const perm of certificatsPermissions) {
      // Check if permission already exists
      const existing = await client.query(`
        SELECT id FROM permissions WHERE code = $1
      `, [perm.code]);

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO permissions (code, name, module, description)
          VALUES ($1, $2, $3, $4)
        `, [perm.code, perm.name, perm.module, perm.description]);
        console.log(`  ✓ Created: ${perm.code}`);
        created++;
      } else {
        console.log(`  - Skipped (exists): ${perm.code}`);
        skipped++;
      }
    }

    await client.query('COMMIT');

    console.log('✅ Migration 114 completed!');
    console.log(`   - Created: ${created} permissions`);
    console.log(`   - Skipped: ${skipped} permissions`);

    res.json({
      success: true,
      message: 'Migration 114 completed successfully',
      details: {
        created,
        skipped
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 114 failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// Status check endpoint
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT code, name FROM permissions
      WHERE code LIKE 'formation.certificats.%'
      ORDER BY code
    `);

    res.json({
      success: true,
      migrationApplied: result.rows.length >= 5,
      permissions: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
