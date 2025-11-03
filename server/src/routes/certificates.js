import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * Générer un numéro de certificat unique
 */
function generateCertificateNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${year}${month}-${random}`;
}

/**
 * Générer un certificat pour un étudiant
 * POST /api/certificates/generate
 * Body: { student_id, formation_id, completion_date, grade? }
 */
router.post('/generate', async (req, res) => {
  try {
    const { student_id, formation_id, completion_date, grade, metadata, template_id } = req.body;

    if (!student_id || !formation_id || !completion_date) {
      return res.status(400).json({
        success: false,
        error: 'student_id, formation_id, and completion_date are required',
      });
    }

    // Vérifier si un certificat existe déjà
    const existingCert = await pool.query(
      'SELECT id FROM certificates WHERE student_id = $1 AND formation_id = $2',
      [student_id, formation_id]
    );

    if (existingCert.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Certificate already exists for this student and formation',
        certificate_id: existingCert.rows[0].id,
      });
    }

    // Déterminer le template à utiliser
    let finalTemplateId = template_id;

    // Si pas de template_id fourni, template_id est maintenant requis
    if (!finalTemplateId) {
      return res.status(400).json({
        success: false,
        error: 'template_id is required',
      });
    }

    // Générer le numéro de certificat
    let certificateNumber = generateCertificateNumber();

    // Vérifier l'unicité (rare collision, mais on vérifie quand même)
    let attempts = 0;
    while (attempts < 5) {
      const exists = await pool.query(
        'SELECT id FROM certificates WHERE certificate_number = $1',
        [certificateNumber]
      );
      if (exists.rows.length === 0) break;
      certificateNumber = generateCertificateNumber();
      attempts++;
    }

    // Créer le certificat avec template_id
    const result = await pool.query(
      `INSERT INTO certificates (student_id, formation_id, certificate_number, completion_date, grade, metadata, template_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        student_id,
        formation_id,
        certificateNumber,
        completion_date,
        grade || null,
        metadata ? JSON.stringify(metadata) : '{}',
        finalTemplateId,
      ]
    );

    res.status(201).json({
      success: true,
      certificate: result.rows[0],
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Récupérer tous les certificats d'un étudiant
 * GET /api/certificates/student/:studentId
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      `SELECT
        c.*,
        f.title as formation_title,
        f.description as formation_description,
        p.full_name as student_name
      FROM certificates c
      INNER JOIN formations f ON f.id = c.formation_id
      INNER JOIN profiles p ON p.id = c.student_id
      WHERE c.student_id = $1
      ORDER BY c.issued_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      certificates: result.rows,
    });
  } catch (error) {
    console.error('Error fetching student certificates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Récupérer un certificat par son ID
 * GET /api/certificates/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        c.*,
        f.title as formation_title,
        f.description as formation_description,
        f.duration_hours,
        p.full_name as student_name
      FROM certificates c
      INNER JOIN formations f ON f.id = c.formation_id
      INNER JOIN profiles p ON p.id = c.student_id
      WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
      });
    }

    res.json({
      success: true,
      certificate: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Vérifier un certificat par son numéro
 * GET /api/certificates/verify/:certificateNumber
 */
router.get('/verify/:certificateNumber', async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    const result = await pool.query(
      `SELECT
        c.*,
        f.title as formation_title,
        p.full_name as student_name
      FROM certificates c
      INNER JOIN formations f ON f.id = c.formation_id
      INNER JOIN profiles p ON p.id = c.student_id
      WHERE c.certificate_number = $1`,
      [certificateNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Certificate not found',
      });
    }

    res.json({
      success: true,
      valid: true,
      certificate: result.rows[0],
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Récupérer tous les certificats (admin)
 * GET /api/certificates
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const formationId = req.query.formation_id;

    let query = `
      SELECT
        c.*,
        f.title as formation_title,
        p.full_name as student_name
      FROM certificates c
      INNER JOIN formations f ON f.id = c.formation_id
      INNER JOIN profiles p ON p.id = c.student_id
    `;

    const params = [];

    if (formationId) {
      query += ' WHERE c.formation_id = $1';
      params.push(formationId);
    }

    query += ' ORDER BY c.issued_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) as total FROM certificates c';
    const countParams = [];

    if (formationId) {
      countQuery += ' WHERE c.formation_id = $1';
      countParams.push(formationId);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      certificates: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Supprimer un certificat (admin seulement)
 * DELETE /api/certificates/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM certificates WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
      });
    }

    res.json({
      success: true,
      message: 'Certificate deleted successfully',
      certificate: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Mettre à jour le metadata d'un certificat
 * PATCH /api/certificates/:id/metadata
 */
router.patch('/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params;
    const { metadata } = req.body;

    if (!metadata) {
      return res.status(400).json({
        success: false,
        error: 'metadata is required',
      });
    }

    const result = await pool.query(
      `UPDATE certificates
       SET metadata = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(metadata), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
      });
    }

    res.json({
      success: true,
      certificate: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating certificate metadata:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
