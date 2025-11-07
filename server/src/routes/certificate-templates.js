import express from 'express';
import pool from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadBackground, uploadFont, deleteFile } from '../middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/certificate-templates
 * Liste tous les templates de certificats
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ct.*,
        tf.name as folder_name,
        tf.parent_id as folder_parent_id
      FROM certificate_templates ct
      LEFT JOIN template_folders tf ON tf.id = ct.folder_id
      ORDER BY ct.created_at DESC
    `);

    res.json({
      success: true,
      templates: result.rows,
    });
  } catch (error) {
    console.error('Error fetching certificate templates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/certificate-templates/custom-fonts/upload
 * Upload une police personnalisée
 */
router.post('/custom-fonts/upload', uploadFont, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const { fontName } = req.body;

    if (!fontName) {
      deleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'fontName is required',
      });
    }

    // Vérifier si une police avec ce nom existe déjà
    const existing = await pool.query(
      'SELECT id FROM custom_fonts WHERE name = $1',
      [fontName]
    );

    if (existing.rows.length > 0) {
      deleteFile(req.file.path);
      return res.status(409).json({
        success: false,
        error: 'A font with this name already exists',
      });
    }

    const fileUrl = `/uploads/fonts/${req.file.filename}`;
    const fileFormat = path.extname(req.file.originalname).substring(1).toLowerCase();

    const result = await pool.query(
      `INSERT INTO custom_fonts (name, file_url, file_format, file_size)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [fontName, fileUrl, fileFormat, req.file.size]
    );

    res.status(201).json({
      success: true,
      font: result.rows[0],
      message: 'Font uploaded successfully',
    });
  } catch (error) {
    if (req.file) {
      deleteFile(req.file.path);
    }
    console.error('Error uploading font:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/certificate-templates/custom-fonts
 * Liste toutes les polices personnalisées
 */
router.get('/custom-fonts', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM custom_fonts ORDER BY name ASC'
    );

    res.json({
      success: true,
      fonts: result.rows,
    });
  } catch (error) {
    console.error('Error fetching custom fonts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/certificate-templates/custom-fonts/:id
 * Supprimer une police personnalisée
 */
router.delete('/custom-fonts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la police
    const existing = await pool.query(
      'SELECT file_url FROM custom_fonts WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Font not found',
      });
    }

    const font = existing.rows[0];

    // Supprimer le fichier
    if (font.file_url) {
      const filePath = path.join(__dirname, '../../', font.file_url);
      deleteFile(filePath);
    }

    // Supprimer de la base de données
    await pool.query('DELETE FROM custom_fonts WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Font deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting font:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/certificate-templates/:id
 * Récupérer un template spécifique par ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM certificate_templates WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      template: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching certificate template:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/certificate-templates
 * Créer un nouveau template
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, template_config, folder_id, background_image_url, background_image_type } = req.body;

    if (!name || !template_config) {
      return res.status(400).json({
        success: false,
        error: 'name and template_config are required',
      });
    }

    // Valider que template_config est un objet JSON valide
    if (typeof template_config !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'template_config must be a valid JSON object',
      });
    }

    // Valider que le dossier existe (si fourni)
    if (folder_id) {
      const folderExists = await pool.query(
        'SELECT id FROM template_folders WHERE id = $1',
        [folder_id]
      );
      if (folderExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Folder not found',
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO certificate_templates (name, description, template_config, folder_id, background_image_url, background_image_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, JSON.stringify(template_config), folder_id || null, background_image_url || null, background_image_type || null]
    );

    res.status(201).json({
      success: true,
      template: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating certificate template:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/certificate-templates/:id
 * Modifier un template existant
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, template_config, folder_id, background_image_url, background_image_type } = req.body;

    // Vérifier que le template existe
    const existing = await pool.query(
      'SELECT id FROM certificate_templates WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Valider que le dossier existe (si fourni)
    if (folder_id !== undefined && folder_id !== null) {
      const folderExists = await pool.query(
        'SELECT id FROM template_folders WHERE id = $1',
        [folder_id]
      );
      if (folderExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Folder not found',
        });
      }
    }

    // Construire la requête UPDATE dynamiquement
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (template_config !== undefined) {
      updates.push(`template_config = $${paramCount++}`);
      values.push(JSON.stringify(template_config));
    }

    if (folder_id !== undefined) {
      updates.push(`folder_id = $${paramCount++}`);
      values.push(folder_id);
    }

    if (background_image_url !== undefined) {
      updates.push(`background_image_url = $${paramCount++}`);
      values.push(background_image_url);
    }

    if (background_image_type !== undefined) {
      updates.push(`background_image_type = $${paramCount++}`);
      values.push(background_image_type);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE certificate_templates
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      template: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating certificate template:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/certificate-templates/:id
 * Supprimer un template
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le template existe
    const templateCheck = await pool.query(
      'SELECT id FROM certificate_templates WHERE id = $1',
      [id]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Vérifier si le template est utilisé par des certificats
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM certificates WHERE template_id = $1',
      [id]
    );

    const usageCount = parseInt(usageCheck.rows[0].count);

    if (usageCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete template: it is used by ${usageCount} certificate(s)`,
        usage_count: usageCount,
      });
    }

    // Supprimer le template
    await pool.query('DELETE FROM certificate_templates WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting certificate template:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/certificate-templates/:id/duplicate
 * Dupliquer un template existant
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le template source
    const source = await pool.query(
      'SELECT * FROM certificate_templates WHERE id = $1',
      [id]
    );

    if (source.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    const sourceTemplate = source.rows[0];

    // Créer une copie avec un nouveau nom et le même dossier
    const newName = `${sourceTemplate.name} (Copie)`;

    const result = await pool.query(
      `INSERT INTO certificate_templates (name, description, template_config, folder_id, background_image_url, background_image_type, preview_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        newName,
        sourceTemplate.description,
        sourceTemplate.template_config,
        sourceTemplate.folder_id,
        sourceTemplate.background_image_url,
        sourceTemplate.background_image_type,
        sourceTemplate.preview_image_url,
      ]
    );

    res.status(201).json({
      success: true,
      template: result.rows[0],
      message: 'Template duplicated successfully',
    });
  } catch (error) {
    console.error('Error duplicating certificate template:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/certificate-templates/:id/duplicate-to-folder
 * Dupliquer un template vers un autre dossier
 */
router.post('/:id/duplicate-to-folder', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetFolderId } = req.body;

    if (!targetFolderId) {
      return res.status(400).json({
        success: false,
        error: 'Target folder ID is required',
      });
    }

    // Récupérer le template source
    const source = await pool.query(
      'SELECT * FROM certificate_templates WHERE id = $1',
      [id]
    );

    if (source.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    const sourceTemplate = source.rows[0];

    // Créer une copie avec le nouveau folder_id
    const result = await pool.query(
      `INSERT INTO certificate_templates
        (name, description, template_config, folder_id, background_image_url, background_image_type, preview_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        sourceTemplate.name + ' - Copie',
        sourceTemplate.description,
        sourceTemplate.template_config,
        targetFolderId,
        sourceTemplate.background_image_url,
        sourceTemplate.background_image_type,
        sourceTemplate.preview_image_url,
      ]
    );

    res.status(201).json({
      success: true,
      template: result.rows[0],
      message: 'Template duplicated to folder successfully',
    });
  } catch (error) {
    console.error('Error duplicating certificate template to folder:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/certificate-templates/seed-defaults
 * Créer les 3 templates par défaut (Moderne, Classique, Élégant)
 */
router.post('/seed-defaults', async (req, res) => {
  try {
    console.log('🌱 Seeding default certificate templates...');

    // Template 1: Classique (template actuel)
    const classiqueConfig = {
      layout: {
        orientation: 'landscape',
        format: 'a4',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
      },
      colors: {
        primary: '#3B82F6',
        secondary: '#FBBF24',
        text: '#1F2937',
        background: '#FFFFFF',
      },
      fonts: {
        title: { family: 'helvetica', size: 32, style: 'bold', color: 'secondary' },
        subtitle: { family: 'helvetica', size: 14, style: 'normal', color: 'text' },
        body: { family: 'helvetica', size: 11, style: 'normal', color: 'text' },
        studentName: { family: 'helvetica', size: 28, style: 'bold', color: 'primary' },
      },
      elements: [
        { id: 'outer-border', type: 'border', style: 'rectangle', color: 'secondary', lineWidth: 1, x: 10, y: 10, width: 'pageWidth - 20', height: 'pageHeight - 20' },
        { id: 'inner-border', type: 'border', style: 'rectangle', color: 'primary', lineWidth: 0.5, x: 15, y: 15, width: 'pageWidth - 30', height: 'pageHeight - 30' },
        { id: 'corner-tl-h', type: 'line', x1: 20, y1: 20, x2: 40, y2: 20, color: 'primary', lineWidth: 2 },
        { id: 'corner-tl-v', type: 'line', x1: 20, y1: 20, x2: 20, y2: 40, color: 'primary', lineWidth: 2 },
        { id: 'corner-tr-h', type: 'line', x1: 'pageWidth - 40', y1: 20, x2: 'pageWidth - 20', y2: 20, color: 'primary', lineWidth: 2 },
        { id: 'corner-tr-v', type: 'line', x1: 'pageWidth - 20', y1: 20, x2: 'pageWidth - 20', y2: 40, color: 'primary', lineWidth: 2 },
        { id: 'corner-bl-h', type: 'line', x1: 20, y1: 'pageHeight - 20', x2: 40, y2: 'pageHeight - 20', color: 'primary', lineWidth: 2 },
        { id: 'corner-bl-v', type: 'line', x1: 20, y1: 'pageHeight - 40', x2: 20, y2: 'pageHeight - 20', color: 'primary', lineWidth: 2 },
        { id: 'corner-br-h', type: 'line', x1: 'pageWidth - 40', y1: 'pageHeight - 20', x2: 'pageWidth - 20', y2: 'pageHeight - 20', color: 'primary', lineWidth: 2 },
        { id: 'corner-br-v', type: 'line', x1: 'pageWidth - 20', y1: 'pageHeight - 40', x2: 'pageWidth - 20', y2: 'pageHeight - 20', color: 'primary', lineWidth: 2 },
        { id: 'title', type: 'text', content: 'CERTIFICAT DE RÉUSSITE', x: 'center', y: 40, font: 'title', align: 'center' },
        { id: 'decorative-line', type: 'line', x1: 'center - 50', y1: 45, x2: 'center + 50', y2: 45, color: 'secondary', lineWidth: 0.5 },
        { id: 'intro-text', type: 'text', content: 'Ce certificat est décerné à', x: 'center', y: 60, font: 'subtitle', align: 'center' },
        { id: 'student-name', type: 'text', content: '{student_name}', x: 'center', y: 75, font: 'studentName', align: 'center' },
        { id: 'underline-name', type: 'line', x1: 'center - nameWidth/2 - 10', y1: 78, x2: 'center + nameWidth/2 + 10', y2: 78, color: 'primary', lineWidth: 0.3 },
        { id: 'formation-intro', type: 'text', content: 'Pour avoir complété avec succès la formation', x: 'center', y: 92, font: 'body', align: 'center' },
        { id: 'formation-title', type: 'text', content: '{formation_title}', x: 'center', y: 105, fontSize: 18, fontStyle: 'bold', align: 'center', maxWidth: 'pageWidth - 80' },
        { id: 'completion-date', type: 'text', content: 'Date de complétion : {completion_date}', x: 'center', y: 125, font: 'body', align: 'center' },
        { id: 'duration', type: 'text', content: 'Durée : {duration_hours} heures', x: 'center', y: 132, font: 'body', align: 'center', condition: 'duration_hours' },
        { id: 'grade', type: 'text', content: 'Note obtenue : {grade}%', x: 'center', y: 139, font: 'body', color: 'primary', fontStyle: 'bold', align: 'center', condition: 'grade' },
        { id: 'signature-line', type: 'line', x1: 'center - 30', y1: 'pageHeight - 60', x2: 'center + 30', y2: 'pageHeight - 60', color: 'text', lineWidth: 0.3 },
        { id: 'signature-label', type: 'text', content: 'Directeur de Formation', x: 'center', y: 'pageHeight - 55', font: 'body', align: 'center' },
        { id: 'certificate-number', type: 'text', content: 'Numéro : {certificate_number}', x: 'center', y: 'pageHeight - 40', fontSize: 9, fontStyle: 'italic', align: 'center' },
        { id: 'issued-date', type: 'text', content: 'Délivré le : {issued_date}', x: 'center', y: 'pageHeight - 35', fontSize: 9, fontStyle: 'italic', align: 'center' },
        { id: 'badge', type: 'circle', x: 'pageWidth - 35', y: 'pageHeight - 35', radius: 15, fillColor: 'secondary' },
        { id: 'badge-text-1', type: 'text', content: 'CERTIFIÉ', x: 'pageWidth - 35', y: 'pageHeight - 38', fontSize: 8, fontStyle: 'bold', color: '#FFFFFF', align: 'center' },
        { id: 'badge-text-2', type: 'text', content: 'RÉUSSITE', x: 'pageWidth - 35', y: 'pageHeight - 32', fontSize: 8, fontStyle: 'bold', color: '#FFFFFF', align: 'center' },
      ],
    };

    // Template 2: Moderne (minimaliste)
    const moderneConfig = {
      layout: {
        orientation: 'landscape',
        format: 'a4',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        text: '#1F2937',
        background: '#FFFFFF',
      },
      fonts: {
        title: { family: 'helvetica', size: 36, style: 'bold', color: 'primary' },
        subtitle: { family: 'helvetica', size: 13, style: 'normal', color: 'secondary' },
        body: { family: 'helvetica', size: 11, style: 'normal', color: 'text' },
        studentName: { family: 'helvetica', size: 24, style: 'bold', color: 'text' },
      },
      elements: [
        { id: 'top-line', type: 'line', x1: 20, y1: 25, x2: 'pageWidth - 20', y2: 25, color: 'primary', lineWidth: 3 },
        { id: 'title', type: 'text', content: 'CERTIFICAT', x: 'center', y: 50, font: 'title', align: 'center' },
        { id: 'subtitle', type: 'text', content: 'de réussite', x: 'center', y: 62, font: 'subtitle', align: 'center' },
        { id: 'student-name', type: 'text', content: '{student_name}', x: 'center', y: 90, font: 'studentName', align: 'center' },
        { id: 'formation-intro', type: 'text', content: 'a complété la formation', x: 'center', y: 105, font: 'body', color: 'secondary', align: 'center' },
        { id: 'formation-title', type: 'text', content: '{formation_title}', x: 'center', y: 120, fontSize: 16, fontStyle: 'bold', color: 'primary', align: 'center', maxWidth: 'pageWidth - 100' },
        { id: 'completion-date', type: 'text', content: 'le {completion_date}', x: 'center', y: 140, font: 'body', color: 'secondary', align: 'center' },
        { id: 'grade', type: 'text', content: 'Résultat : {grade}%', x: 'center', y: 155, fontSize: 12, fontStyle: 'bold', color: 'primary', align: 'center', condition: 'grade' },
        { id: 'certificate-number', type: 'text', content: '{certificate_number}', x: 'center', y: 'pageHeight - 30', fontSize: 9, color: 'secondary', align: 'center' },
        { id: 'bottom-line', type: 'line', x1: 20, y1: 'pageHeight - 25', x2: 'pageWidth - 20', y2: 'pageHeight - 25', color: 'secondary', lineWidth: 1 },
      ],
    };

    // Template 3: Élégant (luxueux)
    const elegantConfig = {
      layout: {
        orientation: 'landscape',
        format: 'a4',
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
      },
      colors: {
        primary: '#9333EA',
        secondary: '#F59E0B',
        text: '#1F2937',
        background: '#FFFFFF',
      },
      fonts: {
        title: { family: 'times', size: 38, style: 'bold', color: 'primary' },
        subtitle: { family: 'times', size: 16, style: 'italic', color: 'secondary' },
        body: { family: 'times', size: 12, style: 'normal', color: 'text' },
        studentName: { family: 'times', size: 30, style: 'bold', color: 'secondary' },
      },
      elements: [
        { id: 'outer-border', type: 'border', style: 'rectangle', color: 'secondary', lineWidth: 3, x: 12, y: 12, width: 'pageWidth - 24', height: 'pageHeight - 24' },
        { id: 'inner-border', type: 'border', style: 'rectangle', color: 'primary', lineWidth: 1, x: 17, y: 17, width: 'pageWidth - 34', height: 'pageHeight - 34' },
        { id: 'title', type: 'text', content: 'Certificat d\'Excellence', x: 'center', y: 45, font: 'title', align: 'center' },
        { id: 'decorative-line-1', type: 'line', x1: 'center - 70', y1: 52, x2: 'center + 70', y2: 52, color: 'secondary', lineWidth: 2 },
        { id: 'intro-text', type: 'text', content: 'Nous certifions que', x: 'center', y: 70, font: 'subtitle', align: 'center' },
        { id: 'student-name', type: 'text', content: '{student_name}', x: 'center', y: 90, font: 'studentName', align: 'center' },
        { id: 'formation-intro', type: 'text', content: 'a brillamment achevé le programme de formation', x: 'center', y: 110, font: 'body', align: 'center' },
        { id: 'formation-title', type: 'text', content: '{formation_title}', x: 'center', y: 125, fontSize: 20, fontStyle: 'bold', color: 'primary', align: 'center', maxWidth: 'pageWidth - 80' },
        { id: 'completion-date', type: 'text', content: 'Complété le {completion_date}', x: 'center', y: 145, font: 'body', align: 'center' },
        { id: 'grade', type: 'text', content: 'Avec une note de {grade}%', x: 'center', y: 157, fontSize: 13, fontStyle: 'bold', color: 'secondary', align: 'center', condition: 'grade' },
        { id: 'signature-line', type: 'line', x1: 'center - 40', y1: 'pageHeight - 50', x2: 'center + 40', y2: 'pageHeight - 50', color: 'secondary', lineWidth: 1 },
        { id: 'signature-label', type: 'text', content: 'Le Directeur', x: 'center', y: 'pageHeight - 43', font: 'body', fontStyle: 'italic', align: 'center' },
        { id: 'certificate-number', type: 'text', content: 'No. {certificate_number}', x: 'center', y: 'pageHeight - 30', fontSize: 9, fontStyle: 'italic', color: 'secondary', align: 'center' },
      ],
    };

    // Get "Général" folder
    const generalFolder = await pool.query(
      'SELECT id FROM template_folders WHERE name = $1 AND parent_id IS NULL',
      ['Général']
    );

    const generalFolderId = generalFolder.rows.length > 0 ? generalFolder.rows[0].id : null;

    const templates = [
      {
        name: 'Classique',
        description: 'Style traditionnel avec bordures décoratives dorées et bleues',
        template_config: classiqueConfig,
      },
      {
        name: 'Moderne',
        description: 'Design minimaliste et professionnel avec lignes épurées',
        template_config: moderneConfig,
      },
      {
        name: 'Élégant',
        description: 'Style luxueux avec dégradés violet et or',
        template_config: elegantConfig,
      },
    ];

    const createdTemplates = [];

    for (const template of templates) {
      // Vérifier si le template existe déjà
      const existing = await pool.query(
        'SELECT id FROM certificate_templates WHERE name = $1',
        [template.name]
      );

      if (existing.rows.length === 0) {
        const result = await pool.query(
          `INSERT INTO certificate_templates (name, description, template_config, folder_id)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [
            template.name,
            template.description,
            JSON.stringify(template.template_config),
            generalFolderId,
          ]
        );

        createdTemplates.push(result.rows[0]);
        console.log(`✅ Template "${template.name}" created`);
      } else {
        console.log(`ℹ️  Template "${template.name}" already exists, skipping`);
      }
    }

    console.log('🎉 Seed complete!');

    res.json({
      success: true,
      message: `${createdTemplates.length} template(s) created`,
      templates: createdTemplates,
    });
  } catch (error) {
    console.error('Error seeding default templates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/certificate-templates/:id/upload-background
 * Upload une image d'arrière-plan pour un template
 */
router.post('/:id/upload-background', (req, res, next) => {
  // Wrapper multer middleware with better error handling
  uploadBackground(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        field: err.field,
        storageErrors: err.storageErrors
      });

      // Handle specific multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds 5 MB limit',
        });
      }

      if (err.message && err.message.includes('Format de fichier')) {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: err.message || 'Upload failed',
      });
    }

    // No error, proceed to route handler
    next();
  });
}, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Handle new templates (not yet saved to database)
    if (id === 'new') {
      const fileUrl = `/uploads/backgrounds/${req.file.filename}`;
      return res.json({
        success: true,
        background_url: fileUrl,
        message: 'Background image uploaded successfully (template not saved yet)',
      });
    }

    // Vérifier que le template existe
    const existing = await pool.query(
      'SELECT background_image_url, background_image_type FROM certificate_templates WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      // Supprimer le fichier uploadé
      deleteFile(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Supprimer l'ancien fichier s'il existe et s'il est de type 'upload'
    const oldTemplate = existing.rows[0];
    if (oldTemplate.background_image_url && oldTemplate.background_image_type === 'upload') {
      const oldFilePath = path.join(__dirname, '../../', oldTemplate.background_image_url);
      deleteFile(oldFilePath);
    }

    // Construire l'URL du fichier
    const fileUrl = `/uploads/backgrounds/${req.file.filename}`;

    // Mettre à jour le template
    const result = await pool.query(
      `UPDATE certificate_templates
       SET background_image_url = $1,
           background_image_type = 'upload',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [fileUrl, id]
    );

    res.json({
      success: true,
      template: result.rows[0],
      background_url: fileUrl,
      message: 'Background image uploaded successfully',
    });
  } catch (error) {
    // Supprimer le fichier uploadé en cas d'erreur
    if (req.file) {
      deleteFile(req.file.path);
    }
    console.error('Error uploading background image:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request file:', req.file);
    console.error('Request params:', req.params);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/certificate-templates/:id/background-url
 * Définir une URL d'arrière-plan pour un template
 */
router.post('/:id/background-url', async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'url is required',
      });
    }

    // Vérifier que le template existe
    const existing = await pool.query(
      'SELECT background_image_url, background_image_type FROM certificate_templates WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Supprimer l'ancien fichier s'il existe et s'il est de type 'upload'
    const oldTemplate = existing.rows[0];
    if (oldTemplate.background_image_url && oldTemplate.background_image_type === 'upload') {
      const oldFilePath = path.join(__dirname, '../../', oldTemplate.background_image_url);
      deleteFile(oldFilePath);
    }

    // Mettre à jour le template
    const result = await pool.query(
      `UPDATE certificate_templates
       SET background_image_url = $1,
           background_image_type = 'url',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [url, id]
    );

    res.json({
      success: true,
      template: result.rows[0],
      message: 'Background URL set successfully',
    });
  } catch (error) {
    console.error('Error setting background URL:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/certificate-templates/:id/background
 * Supprimer l'arrière-plan d'un template
 */
router.delete('/:id/background', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le template
    const existing = await pool.query(
      'SELECT background_image_url, background_image_type FROM certificate_templates WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    const template = existing.rows[0];

    // Supprimer le fichier si c'est un upload
    if (template.background_image_url && template.background_image_type === 'upload') {
      const filePath = path.join(__dirname, '../../', template.background_image_url);
      deleteFile(filePath);
    }

    // Mettre à jour le template
    const result = await pool.query(
      `UPDATE certificate_templates
       SET background_image_url = NULL,
           background_image_type = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({
      success: true,
      template: result.rows[0],
      message: 'Background removed successfully',
    });
  } catch (error) {
    console.error('Error removing background:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
