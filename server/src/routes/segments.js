import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { injectUserScope, buildScopeFilter } from '../middleware/requireScope.js';

const router = express.Router();

/**
 * GET tous les segments
 * Protected: SBAC filtering only (no permission check)
 * Non-admin users only see segments they are assigned to
 * Permission check removed to allow dropdown usage without view_page permission
 */
router.get('/',
  authenticateToken,
  injectUserScope,
  async (req, res) => {
  try {
    // Build base query
    let query = 'SELECT * FROM segments';
    const params = [];

    // SBAC: Apply scope filtering (non-admins see only their assigned segments)
    const scopeFilter = buildScopeFilter(req, 'id', null);  // Filter by segment id

    if (scopeFilter.hasScope) {
      query += ' WHERE (' + scopeFilter.conditions.join(' OR ') + ')';
      params.push(...scopeFilter.params);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET un segment par ID
 * Protected: SBAC only - non-admins can only access segments in their scope
 * Permission check removed to allow dropdown usage without view_page permission
 */
router.get('/:id',
  authenticateToken,
  injectUserScope,
  async (req, res) => {
  try {
    const { id } = req.params;

    // Build query with scope filter
    let query = 'SELECT * FROM segments WHERE id = $1';
    const params = [id];

    // SBAC: Verify user has access to this segment
    const scopeFilter = buildScopeFilter(req, 'id', null);

    if (scopeFilter.hasScope) {
      query += ' AND (' + scopeFilter.conditions.map((condition, index) => {
        return condition.replace(/\$(\d+)/g, (match, num) => `$${params.length + parseInt(num)}`);
      }).join(' OR ') + ')';
      params.push(...scopeFilter.params);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found or access denied',
        code: 'NOT_FOUND_OR_ACCESS_DENIED'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching segment:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST créer un segment - requires create permission
router.post('/', authenticateToken, requirePermission('accounting.segments.create'), async (req, res) => {
  try {
    const { id, name, color } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'Missing required fields: id, name' });
    }

    const result = await pool.query(
      'INSERT INTO segments (id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [id, name, color || '#3B82F6']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating segment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT mettre à jour un segment
 * Protected: RBAC + SBAC - non-admins can only update segments in their scope
 */
router.put('/:id',
  authenticateToken,
  requirePermission('accounting.segments.update'),
  injectUserScope,
  async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    // Build update query with scope filter
    let query = 'UPDATE segments SET name = $1, color = $2 WHERE id = $3';
    const params = [name, color, id];

    // SBAC: Verify user has access to this segment
    const scopeFilter = buildScopeFilter(req, 'id', null);

    if (scopeFilter.hasScope) {
      query += ' AND (' + scopeFilter.conditions.map((condition, index) => {
        return condition.replace(/\$(\d+)/g, (match, num) => `$${params.length + parseInt(num)}`);
      }).join(' OR ') + ')';
      params.push(...scopeFilter.params);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found or access denied',
        code: 'NOT_FOUND_OR_ACCESS_DENIED'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating segment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE supprimer un segment
 * Protected: RBAC + SBAC - non-admins can only delete segments in their scope
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('accounting.segments.delete'),
  injectUserScope,
  async (req, res) => {
  try {
    const { id } = req.params;

    // Build delete query with scope filter
    let query = 'DELETE FROM segments WHERE id = $1';
    const params = [id];

    // SBAC: Verify user has access to this segment
    const scopeFilter = buildScopeFilter(req, 'id', null);

    if (scopeFilter.hasScope) {
      query += ' AND (' + scopeFilter.conditions.map((condition, index) => {
        return condition.replace(/\$(\d+)/g, (match, num) => `$${params.length + parseInt(num)}`);
      }).join(' OR ') + ')';
      params.push(...scopeFilter.params);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found or access denied',
        code: 'NOT_FOUND_OR_ACCESS_DENIED'
      });
    }

    res.json({ message: 'Segment deleted successfully' });
  } catch (error) {
    console.error('Error deleting segment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
