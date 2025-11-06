import express from 'express';
import pkg from 'pg';
import { nanoid } from 'nanoid';

const { Pool } = pkg;
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

/**
 * GET /api/corps-formation
 * Liste tous les corps de formation triés par order_index
 */
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT
        cf.*,
        COUNT(f.id)::integer as formations_count
      FROM corps_formation cf
      LEFT JOIN formations f ON f.corps_formation_id = cf.id
      GROUP BY cf.id
      ORDER BY cf.order_index ASC, cf.name ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      corps: result.rows
    });
  } catch (error) {
    console.error('Erreur récupération corps de formation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

/**
 * GET /api/corps-formation/:id
 * Récupère un corps de formation par ID avec ses formations
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le corps
    const corpsResult = await pool.query(
      'SELECT * FROM corps_formation WHERE id = $1',
      [id]
    );

    if (corpsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Corps de formation non trouvé'
      });
    }

    // Récupérer les formations associées
    const formationsResult = await pool.query(
      `SELECT
        id, title, description, price, level, status, is_pack, created_at
      FROM formations
      WHERE corps_formation_id = $1
      ORDER BY is_pack DESC, title ASC`,
      [id]
    );

    res.json({
      success: true,
      corps: {
        ...corpsResult.rows[0],
        formations: formationsResult.rows
      }
    });
  } catch (error) {
    console.error('Erreur récupération corps:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

/**
 * POST /api/corps-formation
 * Créer un nouveau corps de formation
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon, order_index } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Le nom du corps de formation est obligatoire'
      });
    }

    // Vérifier unicité du nom
    const existingCheck = await pool.query(
      'SELECT id FROM corps_formation WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Un corps de formation avec ce nom existe déjà'
      });
    }

    // Créer le corps
    const id = nanoid();
    const query = `
      INSERT INTO corps_formation (
        id, name, description, color, icon, order_index
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      name.trim(),
      description || null,
      color || '#3B82F6',
      icon || null,
      order_index !== undefined ? order_index : 0
    ]);

    res.status(201).json({
      success: true,
      corps: result.rows[0],
      message: 'Corps de formation créé avec succès'
    });
  } catch (error) {
    console.error('Erreur création corps:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

/**
 * PUT /api/corps-formation/:id
 * Modifier un corps de formation
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, order_index } = req.body;

    // Vérifier que le corps existe
    const existingCorps = await pool.query(
      'SELECT id FROM corps_formation WHERE id = $1',
      [id]
    );

    if (existingCorps.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Corps de formation non trouvé'
      });
    }

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Le nom du corps de formation est obligatoire'
      });
    }

    // Vérifier unicité du nom (sauf pour ce corps)
    const duplicateCheck = await pool.query(
      'SELECT id FROM corps_formation WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Un autre corps de formation avec ce nom existe déjà'
      });
    }

    // Mise à jour
    const query = `
      UPDATE corps_formation
      SET
        name = $1,
        description = $2,
        color = $3,
        icon = $4,
        order_index = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [
      name.trim(),
      description || null,
      color || '#3B82F6',
      icon || null,
      order_index !== undefined ? order_index : 0,
      id
    ]);

    res.json({
      success: true,
      corps: result.rows[0],
      message: 'Corps de formation modifié avec succès'
    });
  } catch (error) {
    console.error('Erreur modification corps:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

/**
 * DELETE /api/corps-formation/:id
 * Supprimer un corps de formation
 * Empêche la suppression si des formations sont liées
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le corps existe
    const existingCorps = await pool.query(
      'SELECT * FROM corps_formation WHERE id = $1',
      [id]
    );

    if (existingCorps.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Corps de formation non trouvé'
      });
    }

    // Vérifier s'il y a des formations liées
    const formationsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM formations WHERE corps_formation_id = $1',
      [id]
    );

    const formationsCount = parseInt(formationsCheck.rows[0].count);

    if (formationsCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Impossible de supprimer ce corps de formation car il contient ${formationsCount} formation(s)`,
        formations_count: formationsCount
      });
    }

    // Suppression
    await pool.query('DELETE FROM corps_formation WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Corps de formation supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression corps:', error);

    // Gestion erreur contrainte FK
    if (error.code === '23503') {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer ce corps car des formations y sont liées'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

/**
 * GET /api/corps-formation/:id/formations
 * Récupère toutes les formations unitaires (non-packs) d'un corps
 * Utilisé pour la création de packs
 */
router.get('/:id/formations', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id, title, description, price, duration_hours, level, status
      FROM formations
      WHERE corps_formation_id = $1
      AND is_pack = FALSE
      AND status = 'published'
      ORDER BY title ASC
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      formations: result.rows
    });
  } catch (error) {
    console.error('Erreur récupération formations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

/**
 * GET /api/corps-formation/stats
 * Statistiques globales des corps de formation
 */
router.get('/stats/global', async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(DISTINCT cf.id)::integer as total_corps,
        COUNT(DISTINCT f.id)::integer as total_formations,
        COUNT(DISTINCT CASE WHEN f.is_pack = TRUE THEN f.id END)::integer as total_packs,
        COUNT(DISTINCT CASE WHEN f.is_pack = FALSE THEN f.id END)::integer as total_formations_unitaires
      FROM corps_formation cf
      LEFT JOIN formations f ON f.corps_formation_id = cf.id
    `;

    const result = await pool.query(statsQuery);

    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

export default router;
