import express from 'express';
import pg from 'pg';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const { Pool } = pg;
const router = express.Router();

// Get pool connection
const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET /api/hr/public-holidays - Get all public holidays
router.get('/', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const { year } = req.query;

    let query = `
      SELECT
        id,
        holiday_date,
        name,
        description,
        is_recurring,
        created_at
      FROM hr_public_holidays
    `;

    const params = [];

    // Filter by year if provided
    if (year) {
      query += ` WHERE EXTRACT(YEAR FROM holiday_date) = $1`;
      params.push(parseInt(year));
    }

    query += ` ORDER BY holiday_date ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      holidays: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching public holidays:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des jours fériés',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/hr/public-holidays - Create a public holiday
 * Protected: Requires hr.holidays.manage permission
 */
router.post('/',
  authenticateToken,
  requirePermission('hr.holidays.manage'),
  async (req, res) => {
  const pool = getPool();

  try {
    const { holiday_date, name, description, is_recurring } = req.body;

    // Validation
    if (!holiday_date || !name) {
      return res.status(400).json({
        success: false,
        error: 'La date et le nom du jour férié sont requis'
      });
    }

    // Check if holiday already exists for this date
    const existing = await pool.query(`
      SELECT id FROM hr_public_holidays
      WHERE holiday_date = $1
    `, [holiday_date]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Un jour férié existe déjà pour cette date'
      });
    }

    // Insert holiday
    const result = await pool.query(`
      INSERT INTO hr_public_holidays (
        holiday_date,
        name,
        description,
        is_recurring,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [holiday_date, name, description || null, is_recurring || false]);

    res.json({
      success: true,
      message: 'Jour férié ajouté avec succès',
      holiday: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating public holiday:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du jour férié',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

/**
 * PUT /api/hr/public-holidays/:id - Update a public holiday
 * Protected: Requires hr.holidays.manage permission
 */
router.put('/:id',
  authenticateToken,
  requirePermission('hr.holidays.manage'),
  async (req, res) => {
  const pool = getPool();

  try {
    const { id } = req.params;
    const { holiday_date, name, description, is_recurring } = req.body;

    // Check if holiday exists
    const existing = await pool.query(`
      SELECT id FROM hr_public_holidays WHERE id = $1
    `, [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Jour férié non trouvé'
      });
    }

    // Update holiday
    const result = await pool.query(`
      UPDATE hr_public_holidays
      SET
        holiday_date = COALESCE($1, holiday_date),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        is_recurring = COALESCE($4, is_recurring),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [holiday_date, name, description, is_recurring, id]);

    res.json({
      success: true,
      message: 'Jour férié mis à jour avec succès',
      holiday: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating public holiday:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du jour férié',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

/**
 * DELETE /api/hr/public-holidays/:id - Delete a public holiday
 * Protected: Requires hr.holidays.manage permission
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('hr.holidays.manage'),
  async (req, res) => {
  const pool = getPool();

  try {
    const { id } = req.params;

    // Check if holiday exists
    const existing = await pool.query(`
      SELECT id FROM hr_public_holidays WHERE id = $1
    `, [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Jour férié non trouvé'
      });
    }

    // Delete holiday
    await pool.query(`
      DELETE FROM hr_public_holidays WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Jour férié supprimé avec succès'
    });

  } catch (error) {
    console.error('Error deleting public holiday:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du jour férié',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/hr/public-holidays/bulk - Bulk create holidays
 * Protected: Requires hr.holidays.manage permission
 */
router.post('/bulk',
  authenticateToken,
  requirePermission('hr.holidays.manage'),
  async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const { holidays } = req.body;

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Un tableau de jours fériés est requis'
      });
    }

    await client.query('BEGIN');

    const created = [];
    const skipped = [];

    for (const holiday of holidays) {
      const { holiday_date, name, description, is_recurring } = holiday;

      if (!holiday_date || !name) {
        skipped.push({ ...holiday, reason: 'Date ou nom manquant' });
        continue;
      }

      // Check if exists
      const existing = await client.query(`
        SELECT id FROM hr_public_holidays WHERE holiday_date = $1
      `, [holiday_date]);

      if (existing.rows.length > 0) {
        skipped.push({ ...holiday, reason: 'Déjà existant' });
        continue;
      }

      // Insert
      const result = await client.query(`
        INSERT INTO hr_public_holidays (
          holiday_date, name, description, is_recurring, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `, [holiday_date, name, description || null, is_recurring || false]);

      created.push(result.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${created.length} jours fériés créés, ${skipped.length} ignorés`,
      created,
      skipped
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk creating holidays:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création en masse',
      details: error.message
    });
  } finally {
    client.release();
    await pool.end();
  }
});

export default router;
