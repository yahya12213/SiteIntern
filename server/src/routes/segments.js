import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// GET tous les segments - requires view permission
router.get('/', authenticateToken, requirePermission('accounting.segments.view_page'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM segments ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET un segment par ID - requires view permission
router.get('/:id', authenticateToken, requirePermission('accounting.segments.view_page'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM segments WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
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

// PUT mettre à jour un segment - requires update permission
router.put('/:id', authenticateToken, requirePermission('accounting.segments.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const result = await pool.query(
      'UPDATE segments SET name = $1, color = $2 WHERE id = $3 RETURNING *',
      [name, color, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating segment:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE supprimer un segment - requires delete permission
router.delete('/:id', authenticateToken, requirePermission('accounting.segments.delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM segments WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json({ message: 'Segment deleted successfully' });
  } catch (error) {
    console.error('Error deleting segment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
