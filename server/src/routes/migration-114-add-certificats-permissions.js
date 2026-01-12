/**
 * Migration 114: Add missing certificats permissions
 *
 * The backend routes use training.certificates.* which converts to formation.certificats.*
 * but these permissions were missing from the database.
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

    // Get formation module ID
    const moduleResult = await client.query(`
      SELECT id FROM modules WHERE code = 'formation' LIMIT 1
    `);

    if (moduleResult.rows.length === 0) {
      throw new Error('Module "formation" not found. Please run migration 109 first.');
    }

    const moduleId = moduleResult.rows[0].id;
    console.log(`✓ Found formation module: ${moduleId}`);

    // Check if certificats submenu already exists
    let submenuResult = await client.query(`
      SELECT id FROM submenus WHERE code = 'certificats' AND module_id = $1
    `, [moduleId]);

    let submenuId;

    if (submenuResult.rows.length === 0) {
      // Create the certificats submenu
      const insertSubmenu = await client.query(`
        INSERT INTO submenus (module_id, code, name, description, sort_order)
        VALUES ($1, 'certificats', 'Certificats', 'Gestion des certificats generes', 8)
        RETURNING id
      `, [moduleId]);
      submenuId = insertSubmenu.rows[0].id;
      console.log(`✓ Created certificats submenu: ${submenuId}`);
    } else {
      submenuId = submenuResult.rows[0].id;
      console.log(`✓ Certificats submenu already exists: ${submenuId}`);
    }

    // Define the certificats permissions to add
    const certificatsPermissions = [
      {
        code: 'formation.certificats.voir',
        name: 'Voir les certificats',
        description: 'Permet de voir les certificats generes',
        action: 'voir',
        sort_order: 1
      },
      {
        code: 'formation.certificats.generer',
        name: 'Generer un certificat',
        description: 'Permet de generer un nouveau certificat pour un etudiant',
        action: 'generer',
        sort_order: 2
      },
      {
        code: 'formation.certificats.modifier',
        name: 'Modifier un certificat',
        description: 'Permet de modifier un certificat existant',
        action: 'modifier',
        sort_order: 3
      },
      {
        code: 'formation.certificats.supprimer',
        name: 'Supprimer un certificat',
        description: 'Permet de supprimer un certificat',
        action: 'supprimer',
        sort_order: 4
      },
      {
        code: 'formation.certificats.telecharger',
        name: 'Telecharger un certificat',
        description: 'Permet de telecharger un certificat en PDF',
        action: 'telecharger',
        sort_order: 5
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
          INSERT INTO permissions (code, name, description, module_id, submenu_id, action, sort_order, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        `, [perm.code, perm.name, perm.description, moduleId, submenuId, perm.action, perm.sort_order]);
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
        skipped,
        submenuId
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
      ORDER BY sort_order
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
