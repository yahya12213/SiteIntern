/**
 * Migration 035 - Copy Gerant Permissions to Custom Roles
 *
 * Copies permissions from the "gerant" role to any custom role that
 * has the same base purpose (like "Gestionnaire de session et d impression").
 */

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.post('/run', async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting Migration 035 - Copy Gerant Permissions...');
    await client.query('BEGIN');

    // Find the gerant role
    const gerantResult = await client.query(
      "SELECT id FROM roles WHERE LOWER(name) = 'gerant'"
    );

    if (gerantResult.rows.length === 0) {
      throw new Error('Role "gerant" not found');
    }

    const gerantRoleId = gerantResult.rows[0].id;

    // Get gerant's permissions
    const gerantPermsResult = await client.query(
      'SELECT permission_id FROM role_permissions WHERE role_id = $1',
      [gerantRoleId]
    );

    const gerantPermissions = gerantPermsResult.rows.map(r => r.permission_id);
    console.log(`  📦 Gerant has ${gerantPermissions.length} permissions`);

    // Find all roles that have "gestionnaire" in the name (case insensitive)
    const customRolesResult = await client.query(
      "SELECT id, name FROM roles WHERE LOWER(name) LIKE '%gestionnaire%'"
    );

    let totalAssigned = 0;
    for (const role of customRolesResult.rows) {
      console.log(`  📦 Assigning permissions to: ${role.name}`);

      // Check how many permissions the role already has
      const existingPermsResult = await client.query(
        'SELECT COUNT(*) as count FROM role_permissions WHERE role_id = $1',
        [role.id]
      );

      const existingCount = parseInt(existingPermsResult.rows[0].count);

      // Only assign if the role has few or no permissions
      if (existingCount < 5) {
        for (const permId of gerantPermissions) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [role.id, permId]
          );
        }
        totalAssigned += gerantPermissions.length;
        console.log(`    ✅ Assigned ${gerantPermissions.length} permissions to ${role.name}`);
      } else {
        console.log(`    ⏭️ Skipping ${role.name} - already has ${existingCount} permissions`);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migration 035 completed successfully!');

    res.json({
      success: true,
      message: 'Gerant permissions copied to custom roles',
      details: {
        gerantPermissionsCount: gerantPermissions.length,
        rolesUpdated: customRolesResult.rows.map(r => r.name),
        totalAssigned,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 035 failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
});

export default router;
