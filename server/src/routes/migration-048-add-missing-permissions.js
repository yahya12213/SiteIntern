import express from 'express';
import pg from 'pg';
const { Pool } = pg;

const router = express.Router();

// Migration 048: Add Missing HR Permissions
// Adds 11 permissions that frontend expects but are missing from migration 045

router.post('/run', async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('=== Migration 048: Add Missing HR Permissions ===');

    // List of missing permissions to add
    const missingPermissions = [
      { code: 'hr.attendance.record', name: 'Enregistrer présence', description: 'Enregistrer les heures d\'arrivée et de départ manuellement' },
      { code: 'hr.attendance.validate', name: 'Valider présence', description: 'Valider et approuver les enregistrements de présence' },
      { code: 'hr.attendance.export', name: 'Exporter présences', description: 'Exporter les données de présence en CSV/Excel' },
      { code: 'hr.overtime.view_reports', name: 'Voir rapports heures sup', description: 'Consulter les rapports d\'heures supplémentaires' },
      { code: 'hr.leaves.view_calendar', name: 'Voir calendrier congés', description: 'Afficher le calendrier des congés' },
      { code: 'hr.leaves.export', name: 'Exporter congés', description: 'Exporter les données de congés' },
      { code: 'hr.dashboard.view_monthly_reports', name: 'Voir rapports mensuels', description: 'Consulter les rapports mensuels RH' },
      { code: 'hr.dashboard.generate_payroll_summary', name: 'Générer résumé paie', description: 'Générer le résumé de paie mensuel' },
      { code: 'hr.dashboard.export_payroll', name: 'Exporter paie', description: 'Exporter les données de paie' },
      { code: 'hr.dashboard.view_alerts', name: 'Voir alertes RH', description: 'Voir les alertes et notifications RH' },
      { code: 'hr.settings.update', name: 'Modifier paramètres RH', description: 'Modifier les paramètres du module RH' }
    ];

    console.log(`Adding ${missingPermissions.length} missing permissions...`);

    for (const perm of missingPermissions) {
      // Check if permission already exists
      const checkExisting = await client.query(`
        SELECT id FROM permissions WHERE code = $1
      `, [perm.code]);

      if (checkExisting.rows.length === 0) {
        // Insert permission
        await client.query(`
          INSERT INTO permissions (code, name, description, module, created_at)
          VALUES ($1, $2, $3, 'hr', NOW())
        `, [perm.code, perm.name, perm.description]);
        console.log(`  ✓ Added: ${perm.code}`);
      } else {
        console.log(`  - Already exists: ${perm.code}`);
      }
    }

    // Automatically assign all new HR permissions to admin role
    console.log('Assigning new permissions to admin role...');

    const adminRoleQuery = await client.query(`
      SELECT id FROM roles WHERE name = 'admin' LIMIT 1
    `);

    if (adminRoleQuery.rows.length > 0) {
      const adminRoleId = adminRoleQuery.rows[0].id;

      for (const perm of missingPermissions) {
        const permQuery = await client.query(`
          SELECT id FROM permissions WHERE code = $1
        `, [perm.code]);

        if (permQuery.rows.length > 0) {
          const permId = permQuery.rows[0].id;

          // Check if already assigned
          const checkAssignment = await client.query(`
            SELECT 1 FROM role_permissions
            WHERE role_id = $1 AND permission_id = $2
          `, [adminRoleId, permId]);

          if (checkAssignment.rows.length === 0) {
            await client.query(`
              INSERT INTO role_permissions (role_id, permission_id)
              VALUES ($1, $2)
            `, [adminRoleId, permId]);
            console.log(`  ✓ Assigned ${perm.code} to admin`);
          }
        }
      }
    } else {
      console.log('  ⚠ Admin role not found - skipping auto-assignment');
    }

    await client.query('COMMIT');

    console.log('=== Migration 048 Complete ===');

    res.json({
      success: true,
      message: 'Migration 048 completed successfully - Added 11 missing HR permissions',
      added_permissions: missingPermissions.map(p => p.code)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 048 Error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to add missing HR permissions',
      hint: 'Check if the permissions table exists and migration 045 has been run'
    });
  } finally {
    client.release();
    await pool.end();
  }
});

export default router;
