import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// GET toutes les villes - requires view permission
router.get('/', authenticateToken, requirePermission('accounting.cities.view_page'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.name, c.code, c.segment_id, c.created_at,
             s.name as segment_name, s.color as segment_color
      FROM cities c
      LEFT JOIN segments s ON c.segment_id = s.id
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET villes par segment - requires view permission
router.get('/by-segment/:segmentId', authenticateToken, requirePermission('accounting.cities.view_page'), async (req, res) => {
  try {
    const { segmentId } = req.params;
    const result = await pool.query(
      'SELECT * FROM cities WHERE segment_id = $1 ORDER BY name',
      [segmentId]
    );
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

// PUT mettre à jour une ville - requires update permission
router.put('/:id', authenticateToken, requirePermission('accounting.cities.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, segment_id } = req.body;

    const result = await pool.query(
      'UPDATE cities SET name = $1, code = $2, segment_id = $3 WHERE id = $4 RETURNING *',
      [name, code, segment_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating city:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE supprimer une ville - requires delete permission
router.delete('/:id', authenticateToken, requirePermission('accounting.cities.delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM cities WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    res.json({ message: 'City deleted successfully' });
  } catch (error) {
    console.error('Error deleting city:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
