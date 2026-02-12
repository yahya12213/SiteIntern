import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Route de diagnostic pour vérifier l'état de la table profiles
router.get('/check-profiles', async (req, res) => {
  try {
    console.log('🔍 [DEBUG-AUTH] Checking profiles table...');

    // Vérifier si la table profiles existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
      ) as table_exists
    `);

    if (!tableCheck.rows[0].table_exists) {
      return res.json({
        success: false,
        error: 'Table profiles does not exist!'
      });
    }

    // Vérifier la structure de la table profiles
    const structureCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position
    `);

    // Compter les utilisateurs
    const countResult = await pool.query(`
      SELECT COUNT(*) as total_users FROM profiles
    `);

    // Vérifier si un user avec role admin existe (sans révéler les détails sensibles)
    const adminCheck = await pool.query(`
      SELECT
        id,
        username,
        LENGTH(password) as password_length,
        role_id,
        created_at
      FROM profiles
      WHERE role_id = 'admin' OR role_id IN (SELECT id FROM roles WHERE name = 'admin')
      ORDER BY created_at
      LIMIT 5
    `);

    // Vérifier si la table roles existe et son contenu
    const rolesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'roles'
      ) as roles_table_exists
    `);

    let rolesInfo = null;
    if (rolesCheck.rows[0].roles_table_exists) {
      const rolesData = await pool.query(`
        SELECT id, name, description FROM roles ORDER BY created_at LIMIT 10
      `);
      rolesInfo = rolesData.rows;
    }

    res.json({
      success: true,
      data: {
        table_exists: true,
        total_users: countResult.rows[0].total_users,
        structure: structureCheck.rows,
        admin_users: adminCheck.rows,
        roles_table_exists: rolesCheck.rows[0].roles_table_exists,
        roles: rolesInfo
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG-AUTH] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Route pour tester l'authentification d'un username spécifique (sans password)
router.get('/check-user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    console.log('🔍 [DEBUG-AUTH] Checking user:', username);

    const result = await pool.query(`
      SELECT
        p.id,
        p.username,
        LENGTH(p.password) as password_length,
        SUBSTRING(p.password, 1, 10) as password_prefix,
        p.role_id,
        p.created_at,
        p.updated_at,
        r.name as role_name
      FROM profiles p
      LEFT JOIN roles r ON p.role_id = r.id
      WHERE p.username = $1
    `, [username]);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        error: `User '${username}' not found in profiles table`
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ [DEBUG-AUTH] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// SUPER POWERFUL: Restoration route inside public debug-auth
router.post('/restore-full-backup', async (req, res) => {
  const restoreKey = req.headers['x-restore-key'];
  if (restoreKey !== 'SUPER_SECRET_RESTORE_2026') {
    return res.status(401).json({ success: false, message: 'Invalid restore key' });
  }

  const { readFileSync } = await import('fs');
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const backupPath = join(__dirname, '../../../railway_backup.sql');

  const client = await pool.connect();
  try {
    console.log('🚀 Starting Restoration from debug-auth...');
    const sql = readFileSync(backupPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    res.json({ success: true, message: 'Database restored successfully via debug-auth!' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (client) client.release();
  }
});

export default router;
