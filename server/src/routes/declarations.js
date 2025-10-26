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
    const { id, professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date, form_data, status } = req.body;

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

    // Utiliser le statut fourni, ou 'brouillon' par défaut
    const declarationStatus = status || 'brouillon';

    const result = await pool.query(
      `INSERT INTO professor_declarations (id, professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date, form_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date, form_data || '{}', declarationStatus]
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
    const { form_data, status, rejection_reason, segment_id, city_id, start_date, end_date } = req.body;

    // Construire dynamiquement la requête SQL en fonction des champs fournis
    const updates = [];
    const params = [];
    let paramCount = 1;

    // Champs de métadonnées modifiables par l'admin
    if (segment_id !== undefined) {
      updates.push(`segment_id = $${paramCount++}`);
      params.push(segment_id);
    }
    if (city_id !== undefined) {
      updates.push(`city_id = $${paramCount++}`);
      params.push(city_id);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      params.push(end_date);
    }

    // Champs standards
    if (form_data !== undefined) {
      updates.push(`form_data = $${paramCount++}`);
      params.push(form_data);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }
    if (rejection_reason !== undefined) {
      updates.push(`rejection_reason = $${paramCount++}`);
      params.push(rejection_reason || null);
    }

    // Timestamps conditionnels
    if (status === 'soumise') {
      updates.push('submitted_at = CURRENT_TIMESTAMP');
    } else if (status === 'approuvee' || status === 'refusee') {
      updates.push('reviewed_at = CURRENT_TIMESTAMP');
    }

    // Toujours mettre à jour updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 1) { // Seulement updated_at
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE professor_declarations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

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
