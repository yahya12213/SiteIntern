/**
 * Roles and Permissions Management API Routes
 * Allows admin users to create, modify, and assign roles and permissions
 */

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/roles
 * Get all roles with their permission counts
 */
router.get('/', requirePermission('accounting.roles.view_page'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.*,
        COUNT(DISTINCT rp.permission_id) as permission_count,
        COUNT(DISTINCT p.id) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN profiles p ON p.role_id = r.id
      GROUP BY r.id
      ORDER BY r.is_system_role DESC, r.name ASC
    `);

    res.json({
      success: true,
      roles: result.rows,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/roles/:id
 * Get a specific role with its permissions
 */
router.get('/:id', requirePermission('accounting.roles.view_page'), async (req, res) => {
  try {
    const { id } = req.params;

    const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    const permissionsResult = await pool.query(`
      SELECT p.*
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.label
    `, [id]);

    const usersResult = await pool.query(`
      SELECT id, username, full_name
      FROM profiles
      WHERE role_id = $1
      ORDER BY full_name
    `, [id]);

    res.json({
      success: true,
      role: roleResult.rows[0],
      permissions: permissionsResult.rows,
      users: usersResult.rows,
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/roles
 * Create a new role
 */
router.post('/', requirePermission('accounting.roles.create'), async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, description, permission_ids } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Role name is required',
      });
    }

    await client.query('BEGIN');

    // Create the role
    const roleResult = await client.query(
      `INSERT INTO roles (name, description, is_system_role)
       VALUES ($1, $2, false)
       RETURNING *`,
      [name.trim(), description || null]
    );

    const newRole = roleResult.rows[0];

    // Assign permissions if provided
    if (permission_ids && Array.isArray(permission_ids) && permission_ids.length > 0) {
      for (const permId of permission_ids) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [newRole.id, permId]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      role: newRole,
      message: 'Role created successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'A role with this name already exists',
      });
    }

    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/roles/:id
 * Update a role's details and permissions
 */
router.put('/:id', requirePermission('accounting.roles.update'), async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { name, description, permission_ids } = req.body;

    // Check if role exists and is not a system role
    const existingRole = await client.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (existingRole.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    if (existingRole.rows[0].is_system_role && name !== existingRole.rows[0].name) {
      return res.status(400).json({
        success: false,
        error: 'Cannot rename system roles',
      });
    }

    await client.query('BEGIN');

    // Update role details
    const updateResult = await client.query(
      `UPDATE roles
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [name?.trim(), description, id]
    );

    // Update permissions if provided
    if (permission_ids && Array.isArray(permission_ids)) {
      // Remove existing permissions
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

      // Add new permissions
      for (const permId of permission_ids) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [id, permId]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      role: updateResult.rows[0],
      message: 'Role updated successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'A role with this name already exists',
      });
    }

    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/roles/:id
 * Delete a role (only non-system roles with no users)
 */
router.delete('/:id', requirePermission('accounting.roles.delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists and is not a system role
    const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    if (roleResult.rows[0].is_system_role) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete system roles',
      });
    }

    // Check if any users have this role
    const usersResult = await pool.query('SELECT COUNT(*) FROM profiles WHERE role_id = $1', [id]);
    if (parseInt(usersResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete role that is assigned to users. Reassign users first.',
      });
    }

    // Delete the role (role_permissions will be cascaded)
    await pool.query('DELETE FROM roles WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/roles/permissions/all
 * Get all available permissions grouped by module
 */
router.get('/permissions/all', requirePermission('users.view', 'users.manage_roles'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM permissions
      ORDER BY module, name
    `);

    // Group by module
    const grouped = {};
    for (const perm of result.rows) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    }

    res.json({
      success: true,
      permissions: result.rows,
      grouped,
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/roles/user/:userId/role
 * Assign a role to a user
 */
router.put('/user/:userId/role', requirePermission('accounting.users.assign_roles'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_id } = req.body;

    if (!role_id) {
      return res.status(400).json({
        success: false,
        error: 'role_id is required',
      });
    }

    // Check if role exists
    const roleExists = await pool.query('SELECT * FROM roles WHERE id = $1', [role_id]);
    if (roleExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    // Update user's role
    const result = await pool.query(
      `UPDATE profiles
       SET role_id = $1, role = $2
       WHERE id = $3
       RETURNING id, username, full_name, role, role_id`,
      [role_id, roleExists.rows[0].name, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Error assigning role to user:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
