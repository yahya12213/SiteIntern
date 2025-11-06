import express from 'express';
import pkg from 'pg';

const { Pool } = pkg;
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

/**
 * Get all centres
 * GET /api/centres
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, adresse, ville, description, created_at, updated_at
       FROM centres
       ORDER BY name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching centres:', error);
    res.status(500).json({ error: 'Error fetching centres', details: error.message });
  }
});

/**
 * Get classes by centre ID
 * GET /api/centres/:id/classes
 */
router.get('/:id/classes', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, centre_id, niveau, description, created_at, updated_at
       FROM classes
       WHERE centre_id = $1
       ORDER BY name ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Error fetching classes', details: error.message });
  }
});

/**
 * Create a new centre
 * POST /api/centres
 */
router.post('/', async (req, res) => {
  const { name, adresse, ville, description } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO centres (name, adresse, ville, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, adresse || null, ville || null, description || null]
    );

    res.status(201).json({
      success: true,
      centre: result.rows[0],
      message: 'Centre créé avec succès',
    });
  } catch (error) {
    console.error('Error creating centre:', error);
    res.status(500).json({ error: 'Error creating centre', details: error.message });
  }
});

/**
 * Create a new class
 * POST /api/centres/:id/classes
 */
router.post('/:id/classes', async (req, res) => {
  const { id } = req.params;
  const { name, niveau, description } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO classes (name, centre_id, niveau, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, id, niveau || null, description || null]
    );

    res.status(201).json({
      success: true,
      classe: result.rows[0],
      message: 'Classe créée avec succès',
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Error creating class', details: error.message });
  }
});

export default router;
