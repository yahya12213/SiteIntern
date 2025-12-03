import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// Module labels in French
const MODULE_LABELS = {
  accounting: 'Gestion Comptable',
  training: 'Formation en Ligne',
  hr: 'Ressources Humaines',
  commercialisation: 'Commercialisation',
  system: 'Système'
};

// Menu labels in French
const MENU_LABELS = {
  dashboard: 'Tableau de bord',
  segments: 'Segments',
  cities: 'Villes',
  users: 'Utilisateurs',
  roles: 'Rôles & Permissions',
  calculation_sheets: 'Fiches de calcul',
  create_declaration: 'Créer déclaration',
  declarations: 'Gérer déclarations',
  formations: 'Gestion des Formations',
  corps: 'Corps de Formation',
  sessions: 'Sessions de Formation',
  analytics: 'Analytics',
  student_reports: 'Rapports Étudiants',
  certificates: 'Certificats',
  certificate_templates: 'Templates de Certificats',
  forums: 'Forums',
  // HR menus
  employees: 'Dossiers du Personnel',
  attendance: 'Temps & Présence',
  overtime: 'Heures Supplémentaires',
  leaves: 'Congés',
  settings: 'Paramètres',
  // Training menus
  professors: 'Professeurs',
  student: 'Étudiants',
  // Accounting menus
  actions: 'Plan d\'Action',
  projects: 'Projets',
  // Commercialisation menus
  prospects: 'Prospects',
  clients: 'Clients'
};

// Action labels in French
const ACTION_LABELS = {
  view_page: 'Voir la page',
  create: 'Créer',
  update: 'Modifier',
  delete: 'Supprimer',
  view_all: 'Voir tout',
  approve: 'Approuver',
  reject: 'Rejeter',
  request_modification: 'Demander modification',
  publish: 'Publier',
  duplicate: 'Dupliquer',
  export: 'Exporter',
  settings: 'Paramètres',
  import_cities: 'Importer villes',
  bulk_delete: 'Suppression en masse',
  assign_segments: 'Assigner segments',
  assign_cities: 'Assigner villes',
  assign_roles: 'Assigner rôles',
  create_pack: 'Créer un pack',
  edit_content: 'Éditer contenu',
  view_details: 'Voir détails',
  export_csv: 'Exporter CSV',
  export_pdf: 'Exporter PDF',
  change_period: 'Changer période',
  search: 'Rechercher',
  download: 'Télécharger',
  create_folder: 'Créer dossier',
  create_template: 'Créer template',
  rename: 'Renommer',
  edit_canvas: 'Éditer canvas',
  organize: 'Organiser',
  pin_discussion: 'Épingler discussion',
  lock_discussion: 'Verrouiller discussion',
  delete_content: 'Supprimer contenu',
  moderate: 'Modérer'
};

// GET /api/permissions - List all permissions (flat)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, module, menu, action, code, label, description, sort_order, created_at
      FROM permissions
      ORDER BY sort_order, module, menu, action
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions'
    });
  }
});

// GET /api/permissions/tree - Get permissions in hierarchical tree structure
router.get('/tree', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, module, menu, action, code, label, description, sort_order
      FROM permissions
      ORDER BY sort_order, module, menu, action
    `);

    // Build tree structure
    const tree = {};

    for (const perm of result.rows) {
      // Initialize module if not exists
      if (!tree[perm.module]) {
        tree[perm.module] = {
          id: perm.module,
          label: MODULE_LABELS[perm.module] || perm.module,
          menus: {}
        };
      }

      // Initialize menu if not exists
      if (!tree[perm.module].menus[perm.menu]) {
        tree[perm.module].menus[perm.menu] = {
          id: perm.menu,
          label: MENU_LABELS[perm.menu] || perm.menu,
          actions: []
        };
      }

      // Add action to menu
      tree[perm.module].menus[perm.menu].actions.push({
        id: perm.id,
        action: perm.action,
        code: `${perm.module}.${perm.menu}.${perm.action}`,
        label: perm.label,
        actionLabel: ACTION_LABELS[perm.action] || perm.action,
        description: perm.description
      });
    }

    // Convert to array format for easier frontend handling
    const treeArray = Object.values(tree).map(module => ({
      ...module,
      menus: Object.values(module.menus)
    }));

    res.json({
      success: true,
      data: treeArray,
      labels: {
        modules: MODULE_LABELS,
        menus: MENU_LABELS,
        actions: ACTION_LABELS
      }
    });
  } catch (error) {
    console.error('Error fetching permissions tree:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions tree'
    });
  }
});

// GET /api/permissions/by-role/:roleId - Get permissions for a specific role
router.get('/by-role/:roleId', authenticateToken, async (req, res) => {
  try {
    const { roleId } = req.params;

    const result = await pool.query(`
      SELECT p.id, p.module, p.menu, p.action, p.code, p.label
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.sort_order
    `, [roleId]);

    // Return just the permission codes for easy checking
    const permissionCodes = result.rows.map(r => r.code);

    res.json({
      success: true,
      data: result.rows,
      codes: permissionCodes
    });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role permissions'
    });
  }
});

// PUT /api/permissions/role/:roleId - Update permissions for a role (set all at once)
router.put('/role/:roleId', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body; // Array of permission UUIDs

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        error: 'permissionIds must be an array'
      });
    }

    await client.query('BEGIN');

    // Check if role exists
    const roleCheck = await client.query('SELECT id, name FROM roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    const roleName = roleCheck.rows[0].name;

    // Don't allow modifying admin role's permissions
    if (roleName === 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Cannot modify admin role permissions'
      });
    }

    // Delete all existing permissions for this role
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

    // Insert new permissions
    if (permissionIds.length > 0) {
      for (const permId of permissionIds) {
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [roleId, permId]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Updated ${permissionIds.length} permissions for role ${roleName}`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating role permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role permissions'
    });
  } finally {
    client.release();
  }
});

// GET /api/permissions/user/:userId - Get all permissions for a user (from all their roles)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get permissions from user_roles table (N-N relationship)
    const result = await pool.query(`
      SELECT DISTINCT p.code
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      INNER JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
    `, [userId]);

    const permissionCodes = result.rows.map(r => r.code);

    res.json({
      success: true,
      data: permissionCodes
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user permissions'
    });
  }
});

// GET /api/permissions/stats - Get permission statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        module,
        COUNT(*) as permission_count,
        COUNT(DISTINCT menu) as menu_count
      FROM permissions
      GROUP BY module
      ORDER BY module
    `);

    const totalPerms = await pool.query('SELECT COUNT(*) as count FROM permissions');
    const totalRoles = await pool.query('SELECT COUNT(*) as count FROM roles');
    const totalAssignments = await pool.query('SELECT COUNT(*) as count FROM role_permissions');

    res.json({
      success: true,
      data: {
        byModule: stats.rows,
        totals: {
          permissions: parseInt(totalPerms.rows[0].count),
          roles: parseInt(totalRoles.rows[0].count),
          assignments: parseInt(totalAssignments.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching permission stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permission statistics'
    });
  }
});

export default router;
