import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { injectUserScope, buildScopeFilter } from '../middleware/requireScope.js';

const router = express.Router();

/**
 * GET toutes les villes
 * Protected: SBAC filtering only (no permission check)
 * Non-admin users only see cities they are assigned to
 * Permission check removed to allow dropdown usage without view_page permission
 */
router.get('/',
  authenticateToken,
  injectUserScope,
  async (req, res) => {
  try {
    // Build base query
    let query = `
      SELECT c.id, c.name, c.code, c.segment_id, c.created_at,
             s.name as segment_name, s.color as segment_color
      FROM cities c
      LEFT JOIN segments s ON c.segment_id = s.id
    `;
    const params = [];

    // SBAC: Apply scope filtering
    const scopeFilter = buildScopeFilter(req, 'c.segment_id', 'c.id');

    if (scopeFilter.hasScope) {
      query += ' WHERE ' + scopeFilter.conditions.join(' AND ');
      params.push(...scopeFilter.params);
    }

    query += ' ORDER BY c.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET villes par segment
 * Protected: SBAC only - filters by user's assigned cities within segment
 * Permission check removed to allow dropdown usage without view_page permission
 */
router.get('/by-segment/:segmentId',
  authenticateToken,
  injectUserScope,
  async (req, res) => {
  try {
    const { segmentId } = req.params;

    let query = 'SELECT * FROM cities WHERE segment_id = $1';
    const params = [segmentId];

    // SBAC: Apply scope filtering
    const scopeFilter = buildScopeFilter(req, 'segment_id', 'id');

    if (scopeFilter.hasScope) {
      query += ' AND (' + scopeFilter.conditions.map((condition, index) => {
        return condition.replace(/\$(\d+)/g, (match, num) => `$${params.length + parseInt(num)}`);
      }).join(' OR ') + ')';
      params.push(...scopeFilter.params);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST créer une ville - requires create permission
router.post('/', authenticateToken, requirePermission('accounting.cities.create'), async (req, res) => {
  try {
    const { id, name, code, segment_id } = req.body;

    if (!id || !name || !code || !segment_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      'INSERT INTO cities (id, name, code, segment_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, code, segment_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating city:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT mettre à jour une ville
 * Protected: RBAC + SBAC - can only update cities in scope
 */
router.put('/:id',
  authenticateToken,
  requirePermission('accounting.cities.update'),
  injectUserScope,
  async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, segment_id } = req.body;

    let query = 'UPDATE cities SET name = $1, code = $2, segment_id = $3 WHERE id = $4';
    const params = [name, code, segment_id, id];

    // SBAC: Verify access
    const scopeFilter = buildScopeFilter(req, 'segment_id', 'id');
    if (scopeFilter.hasScope) {
      query += ' AND (' + scopeFilter.conditions.map((condition, index) => {
        return condition.replace(/\$(\d+)/g, (match, num) => `$${params.length + parseInt(num)}`);
      }).join(' OR ') + ')';
      params.push(...scopeFilter.params);
    }

    query += ' RETURNING *';
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'City not found or access denied', code: 'NOT_FOUND_OR_ACCESS_DENIED' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating city:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE supprimer une ville
 * Protected: RBAC + SBAC - can only delete cities in scope
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('accounting.cities.delete'),
  injectUserScope,
  async (req, res) => {
  try {
    const { id } = req.params;

    let query = 'DELETE FROM cities WHERE id = $1';
    const params = [id];

    // SBAC: Verify access
    const scopeFilter = buildScopeFilter(req, 'segment_id', 'id');
    if (scopeFilter.hasScope) {
      query += ' AND (' + scopeFilter.conditions.map((condition, index) => {
        return condition.replace(/\$(\d+)/g, (match, num) => `$${params.length + parseInt(num)}`);
      }).join(' OR ') + ')';
      params.push(...scopeFilter.params);
    }

    query += ' RETURNING *';
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'City not found or access denied', code: 'NOT_FOUND_OR_ACCESS_DENIED' });
    }

    res.json({ message: 'City deleted successfully' });
  } catch (error) {
    console.error('Error deleting city:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
