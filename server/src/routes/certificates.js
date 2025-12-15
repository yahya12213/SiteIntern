import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
import path from 'path';
import * as archiveManager from '../utils/archiveManager.js';
import { CertificatePDFGenerator } from '../services/certificatePDFGenerator.js';

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
 * Générer un certificat pour un étudiant avec génération PDF serveur
 * POST /api/certificates/generate
 * Body: { student_id, formation_id, session_id, completion_date, grade?, metadata?, template_id? }
 * Protected: Requires training.certificates.generate permission
 */
router.post('/generate',
  authenticateToken,
  requirePermission('training.certificates.generate'),
  async (req, res) => {
  const client = await pool.connect();
  let createdFolders = [];

  try {
    let { student_id, formation_id, session_id, completion_date, grade, metadata, template_id, document_type, template_name } = req.body;

    // Validation des champs requis
    if (!student_id || !formation_id || !completion_date) {
      return res.status(400).json({
        success: false,
        error: 'student_id, formation_id, and completion_date are required',
      });
    }

    // Si session_id n'est pas fourni, essayer de le récupérer automatiquement
    if (!session_id) {
      console.log('🔍 session_id not provided, attempting automatic detection...');

      const sessionLookup = await client.query(
        `SELECT se.session_id
         FROM session_etudiants se
         WHERE se.student_id = $1 AND se.formation_id = $2
         ORDER BY se.date_inscription DESC
         LIMIT 1`,
        [student_id, formation_id]
      );

      if (sessionLookup.rows.length > 0) {
        session_id = sessionLookup.rows[0].session_id;
        console.log(`✓ session_id detected automatically: ${session_id}`);
      } else {
        console.warn('⚠ Warning: No session enrollment found for this student/formation. Certificate will be created without archive.');
      }
    }

    // Vérifier si un certificat existe déjà pour cette combinaison student + formation + session + document_type
    // Note: On vérifie avec session_id ET document_type pour permettre plusieurs types de documents par session
    const finalDocumentType = document_type || 'certificat';
    const existingCert = await client.query(
      `SELECT id FROM certificates
       WHERE student_id = $1 AND formation_id = $2
       AND (session_id = $3 OR (session_id IS NULL AND $3 IS NULL))
       AND document_type = $4`,
      [student_id, formation_id, session_id || null, finalDocumentType]
    );

    if (existingCert.rows.length > 0) {
      console.log(`⚠️ Certificate already exists for student ${student_id}, formation ${formation_id}, session ${session_id || 'NULL'}, document_type ${finalDocumentType}`);
      return res.status(409).json({
        success: false,
        error: `Un ${finalDocumentType} existe déjà pour cet étudiant dans cette session`,
        certificate_id: existingCert.rows[0].id,
      });
    }

    // Récupérer les informations de l'étudiant
    const studentResult = await client.query(
      'SELECT id, prenom, nom, cin FROM students WHERE id = $1',
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    const student = studentResult.rows[0];

    // Récupérer les informations de la formation
    const formationResult = await client.query(
      'SELECT id, title, duration_hours, certificate_template_id FROM formations WHERE id = $1',
      [formation_id]
    );

    if (formationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Formation not found',
      });
    }

    const formation = formationResult.rows[0];

    // Déterminer le template à utiliser
    let finalTemplateId = template_id || formation.certificate_template_id;

    if (!finalTemplateId) {
      // Prendre le premier template disponible
      const templatesResult = await client.query(
        'SELECT id FROM certificate_templates ORDER BY created_at ASC LIMIT 1'
      );

      if (templatesResult.rows.length > 0) {
        finalTemplateId = templatesResult.rows[0].id;
      } else {
        return res.status(400).json({
          success: false,
          error: 'No certificate template available. Please create a certificate template first.',
        });
      }
    }

    // Récupérer le template
    const templateResult = await client.query(
      'SELECT * FROM certificate_templates WHERE id = $1',
      [finalTemplateId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Certificate template not found',
      });
    }

    const template = templateResult.rows[0];

    // Générer le numéro de certificat
    let certificateNumber = generateCertificateNumber();

    // Vérifier l'unicité
    let attempts = 0;
    while (attempts < 5) {
      const exists = await client.query(
        'SELECT id FROM certificates WHERE certificate_number = $1',
        [certificateNumber]
      );
      if (exists.rows.length === 0) break;
      certificateNumber = generateCertificateNumber();
      attempts++;
    }

    // Début de la transaction
    await client.query('BEGIN');

    // Créer l'enregistrement du certificat
    const certResult = await client.query(
      `INSERT INTO certificates (
        student_id, formation_id, session_id, certificate_number,
        completion_date, grade, metadata, template_id,
        document_type, template_name, print_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        student_id,
        formation_id,
        session_id || null,
        certificateNumber,
        completion_date,
        grade || null,
        metadata ? JSON.stringify(metadata) : '{}',
        finalTemplateId,
        document_type || 'certificat',
        template_name || template.name || 'Template par défaut',
        'not_printed'
      ]
    );

    const certificate = certResult.rows[0];

    // Préparer les données pour le PDF
    // Note: certificate.metadata est déjà un objet JS (PostgreSQL jsonb est auto-parsé par le driver pg)
    const existingMetadata = typeof certificate.metadata === 'string'
      ? JSON.parse(certificate.metadata || '{}')
      : (certificate.metadata || {});

    const certData = {
      ...certificate,
      student_name: `${student.prenom} ${student.nom}`,
      formation_title: formation.title,
      duration_hours: formation.duration_hours,
      metadata: {
        ...existingMetadata,
        prenom: student.prenom,
        nom: student.nom,
        cin: student.cin
      }
    };

    // Générer le PDF si session_id est fourni
    let pdfPath = null;
    let folderPath = null;

    if (session_id) {
      try {
        // Créer ou récupérer le dossier étudiant
        folderPath = await archiveManager.getOrCreateStudentFolder(session_id, student);
        createdFolders.push(folderPath);

        // Générer le nom du fichier PDF
        const pdfFileName = `certificat_${certificateNumber}.pdf`;
        pdfPath = path.join(folderPath, pdfFileName);

        // Générer le PDF
        const pdfGenerator = new CertificatePDFGenerator();
        await pdfGenerator.generateCertificate(certData, template, pdfPath);

        // Mettre à jour l'enregistrement avec le chemin du fichier
        await client.query(
          'UPDATE certificates SET file_path = $1, archive_folder = $2 WHERE id = $3',
          [pdfPath, folderPath, certificate.id]
        );

        console.log(`✓ PDF généré et stocké: ${pdfPath}`);
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        // Rollback et cleanup
        await client.query('ROLLBACK');

        // Cleanup des dossiers créés
        for (const folder of createdFolders) {
          await archiveManager.cleanupFolder(folder);
        }

        return res.status(500).json({
          success: false,
          error: 'Failed to generate PDF: ' + pdfError.message,
        });
      }
    }

    // Commit de la transaction
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      certificate: {
        ...certificate,
        file_path: pdfPath,
        archive_folder: folderPath
      },
      pdf_generated: !!pdfPath,
      message: pdfPath ? 'Certificate created and PDF generated successfully' : 'Certificate created (no PDF generated - session_id required)'
    });

  } catch (error) {
    // Rollback en cas d'erreur
    await client.query('ROLLBACK');

    // Cleanup des dossiers créés
    for (const folder of createdFolders) {
      await archiveManager.cleanupFolder(folder);
    }

    console.error('Error generating certificate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * Récupérer tous les certificats d'un étudiant
 * GET /api/certificates/student/:studentId
 * Protected: Requires training.certificates.view permission
 */
router.get('/student/:studentId',
  authenticateToken,
  requirePermission('training.certificates.view'),
  async (req, res) => {
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
 * Protected: Requires training.certificates.view permission
 */
router.get('/:id',
  authenticateToken,
  requirePermission('training.certificates.view'),
  async (req, res) => {
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
 * Protected: Requires training.certificates.view permission
 */
router.get('/verify/:certificateNumber',
  authenticateToken,
  requirePermission('training.certificates.view'),
  async (req, res) => {
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
 * Protected: Requires training.certificates.view_page permission
 */
router.get('/',
  authenticateToken,
  requirePermission('training.certificates.view_page'),
  async (req, res) => {
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
 * Protected: Requires training.certificates.delete permission
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('training.certificates.delete'),
  async (req, res) => {
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
 * Protected: Requires training.certificates.update permission
 */
router.patch('/:id/metadata',
  authenticateToken,
  requirePermission('training.certificates.update'),
  async (req, res) => {
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

// POST /api/certificates/:id/mark-printed
// Marque un document comme imprimé avec le nom de l'imprimante
router.post('/:id/mark-printed',
  authenticateToken,
  requirePermission('training.certificates.generate'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { printer_name } = req.body;

      if (!printer_name) {
        return res.status(400).json({
          success: false,
          error: 'printer_name is required'
        });
      }

      const result = await pool.query(`
        UPDATE certificates
        SET printed_at = NOW(),
            printer_name = $1,
            print_status = 'printed'
        WHERE id = $2
        RETURNING *
      `, [printer_name, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Certificate not found'
        });
      }

      res.json({
        success: true,
        message: 'Document marqué comme imprimé',
        certificate: result.rows[0]
      });
    } catch (error) {
      console.error('Error marking certificate as printed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
