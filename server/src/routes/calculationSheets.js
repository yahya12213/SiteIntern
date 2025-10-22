import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET toutes les fiches
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const sheetsResult = await client.query('SELECT * FROM calculation_sheets ORDER BY created_at DESC');
    const sheets = sheetsResult.rows;

    // Enrichir avec segments et villes
    for (const sheet of sheets) {
      const segmentsResult = await client.query(
        'SELECT segment_id FROM calculation_sheet_segments WHERE sheet_id = $1',
        [sheet.id]
      );
      sheet.segment_ids = segmentsResult.rows.map(row => row.segment_id);

      const citiesResult = await client.query(
        'SELECT city_id FROM calculation_sheet_cities WHERE sheet_id = $1',
        [sheet.id]
      );
      sheet.city_ids = citiesResult.rows.map(row => row.city_id);
    }

    res.json(sheets);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// GET une fiche par ID
router.get('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const sheetResult = await client.query('SELECT * FROM calculation_sheets WHERE id = $1', [id]);

    if (sheetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const sheet = sheetResult.rows[0];

    // Segments et villes
    const segmentsResult = await client.query(
      'SELECT segment_id FROM calculation_sheet_segments WHERE sheet_id = $1',
      [id]
    );
    sheet.segment_ids = segmentsResult.rows.map(row => row.segment_id);

    const citiesResult = await client.query(
      'SELECT city_id FROM calculation_sheet_cities WHERE sheet_id = $1',
      [id]
    );
    sheet.city_ids = citiesResult.rows.map(row => row.city_id);

    res.json(sheet);
  } catch (error) {
    console.error('Error fetching sheet:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// POST créer une fiche
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, title, template_data, status, sheet_date, segment_ids, city_ids } = req.body;

    await client.query('BEGIN');

    const sheetResult = await client.query(
      'INSERT INTO calculation_sheets (id, title, template_data, status, sheet_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, title, template_data, status || 'draft', sheet_date]
    );

    const sheet = sheetResult.rows[0];

    // Ajouter segments
    if (segment_ids && segment_ids.length > 0) {
      for (const segmentId of segment_ids) {
        await client.query(
          'INSERT INTO calculation_sheet_segments (sheet_id, segment_id) VALUES ($1, $2)',
          [id, segmentId]
        );
      }
      sheet.segment_ids = segment_ids;
    }

    // Ajouter villes
    if (city_ids && city_ids.length > 0) {
      for (const cityId of city_ids) {
        await client.query(
          'INSERT INTO calculation_sheet_cities (sheet_id, city_id) VALUES ($1, $2)',
          [id, cityId]
        );
      }
      sheet.city_ids = city_ids;
    }

    await client.query('COMMIT');
    res.status(201).json(sheet);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sheet:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// PUT mettre à jour une fiche
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { title, template_data, status, sheet_date, segment_ids, city_ids } = req.body;

    await client.query('BEGIN');

    const sheetResult = await client.query(
      'UPDATE calculation_sheets SET title = $1, template_data = $2, status = $3, sheet_date = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [title, template_data, status, sheet_date, id]
    );

    if (sheetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const sheet = sheetResult.rows[0];

    // Mettre à jour segments
    await client.query('DELETE FROM calculation_sheet_segments WHERE sheet_id = $1', [id]);
    if (segment_ids && segment_ids.length > 0) {
      for (const segmentId of segment_ids) {
        await client.query(
          'INSERT INTO calculation_sheet_segments (sheet_id, segment_id) VALUES ($1, $2)',
          [id, segmentId]
        );
      }
      sheet.segment_ids = segment_ids;
    }

    // Mettre à jour villes
    await client.query('DELETE FROM calculation_sheet_cities WHERE sheet_id = $1', [id]);
    if (city_ids && city_ids.length > 0) {
      for (const cityId of city_ids) {
        await client.query(
          'INSERT INTO calculation_sheet_cities (sheet_id, city_id) VALUES ($1, $2)',
          [id, cityId]
        );
      }
      sheet.city_ids = city_ids;
    }

    await client.query('COMMIT');
    res.json(sheet);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating sheet:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// DELETE supprimer une fiche
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM calculation_sheets WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    res.json({ message: 'Sheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
