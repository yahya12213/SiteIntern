import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET toutes les déclarations (avec infos jointes)
router.get('/', async (req, res) => {
  try {
    const { professor_id } = req.query;

    let query = `
      SELECT pd.*,
             p.full_name as professor_name,
             s.name as segment_name,
             c.name as city_name,
             cs.title as sheet_title
      FROM professor_declarations pd
      LEFT JOIN profiles p ON pd.professor_id = p.id
      LEFT JOIN segments s ON pd.segment_id = s.id
      LEFT JOIN cities c ON pd.city_id = c.id
      LEFT JOIN calculation_sheets cs ON pd.calculation_sheet_id = cs.id
    `;

    const params = [];
    if (professor_id) {
      query += ' WHERE pd.professor_id = $1';
      params.push(professor_id);
    }

    query += ' ORDER BY pd.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching declarations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET une déclaration par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT pd.*,
             p.full_name as professor_name,
             s.name as segment_name,
             c.name as city_name,
             cs.title as sheet_title,
             cs.template_data
      FROM professor_declarations pd
      LEFT JOIN profiles p ON pd.professor_id = p.id
      LEFT JOIN segments s ON pd.segment_id = s.id
      LEFT JOIN cities c ON pd.city_id = c.id
      LEFT JOIN calculation_sheets cs ON pd.calculation_sheet_id = cs.id
      WHERE pd.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Declaration not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching declaration:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST créer une déclaration
router.post('/', async (req, res) => {
  try {
    const { id, professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date, form_data } = req.body;

    // Vérifier si une déclaration identique existe déjà
    const duplicateCheck = await pool.query(
      `SELECT id FROM professor_declarations
       WHERE professor_id = $1
       AND calculation_sheet_id = $2
       AND segment_id = $3
       AND city_id = $4
       AND start_date = $5
       AND end_date = $6`,
      [professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Une déclaration existe déjà pour cette période, ville et segment'
      });
    }

    const result = await pool.query(
      `INSERT INTO professor_declarations (id, professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date, form_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'brouillon') RETURNING *`,
      [id, professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date, form_data || '{}']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating declaration:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT mettre à jour une déclaration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { form_data, status, rejection_reason } = req.body;

    let query, params;
    if (status === 'soumise') {
      query = 'UPDATE professor_declarations SET form_data = $1, status = $2, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *';
      params = [form_data, status, id];
    } else if (status === 'approuvee' || status === 'refusee') {
      query = 'UPDATE professor_declarations SET status = $1, rejection_reason = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *';
      params = [status, rejection_reason || null, id];
    } else {
      query = 'UPDATE professor_declarations SET form_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
      params = [form_data, id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Declaration not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating declaration:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE supprimer une déclaration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM professor_declarations WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Declaration not found' });
    }

    res.json({ message: 'Declaration deleted successfully' });
  } catch (error) {
    console.error('Error deleting declaration:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
