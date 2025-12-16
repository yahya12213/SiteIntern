import express from 'express';
import pool from '../config/database.js';
import { nanoid } from 'nanoid';
import { uploadProfileImage } from '../middleware/upload.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

/**
 * Check if student with CIN already exists
 * GET /api/students/check-cin/:cin
 * Protected: Requires authentication and students view permission
 */
router.get('/check-cin/:cin',
  authenticateToken,
  requirePermission('training.students.view_page'),
  async (req, res) => {
  const { cin } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, cin, email, phone, whatsapp,
              date_naissance, lieu_naissance, adresse, statut_compte, profile_image_url
       FROM students
       WHERE cin = $1`,
      [cin]
    );

    if (result.rows.length > 0) {
      res.json({
        exists: true,
        student: result.rows[0],
      });
    } else {
      res.json({
        exists: false,
      });
    }
  } catch (error) {
    console.error('Error checking CIN:', error);
    res.status(500).json({ error: 'Error checking CIN', details: error.message });
  }
});

/**
 * Create a new student
 * POST /api/students
 * Accepts multipart/form-data with optional profile_image file
 * Protected: Requires authentication and students create permission
 */
router.post('/',
  authenticateToken,
  requirePermission('training.students.create'),
  uploadProfileImage,
  async (req, res) => {
  const {
    nom,
    prenom,
    cin,
    email,
    phone,
    whatsapp,
    date_naissance,
    lieu_naissance,
    adresse,
    statut_compte,
  } = req.body;

  try {
    // Check if CIN already exists
    const existingStudent = await pool.query('SELECT id FROM students WHERE cin = $1', [cin]);

    if (existingStudent.rows.length > 0) {
      return res.status(400).json({ error: 'Un étudiant avec ce CIN existe déjà' });
    }

    // Handle profile image upload
    let profile_image_url = null;
    if (req.file) {
      // Generate URL relative to server uploads directory
      profile_image_url = `/uploads/profiles/${req.file.filename}`;
    }

    const result = await pool.query(
      `INSERT INTO students (
        nom, prenom, cin, email, phone, whatsapp,
        date_naissance, lieu_naissance, adresse, statut_compte, profile_image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        nom,
        prenom,
        cin,
        email || null,
        phone,
        whatsapp || null,
        date_naissance,
        lieu_naissance,
        adresse,
        statut_compte || 'actif',
        profile_image_url,
      ]
    );

    res.status(201).json({
      success: true,
      student: result.rows[0],
      message: 'Étudiant créé avec succès',
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'étudiant', details: error.message });
  }
});

/**
 * Get all students with their session information
 * GET /api/students/with-sessions
 * Protected: Requires authentication and students view permission
 */
router.get('/with-sessions',
  authenticateToken,
  requirePermission('training.students.view_page'),
  async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.nom,
        s.prenom,
        s.cin,
        s.phone,
        s.email,
        s.statut_compte,
        s.profile_image_url,
        se.id as enrollment_id,
        se.session_id,
        se.statut_paiement,
        se.montant_total,
        se.montant_paye,
        se.montant_du,
        sf.titre as session_titre,
        sf.session_type,
        sf.statut as session_statut,
        v.name as ville,
        (
          SELECT string_agg(f.title, ', ')
          FROM session_formations ssf
          JOIN formations f ON ssf.formation_id = f.id
          WHERE ssf.session_id = sf.id
        ) as formation_titre,
        CASE WHEN se.id IS NOT NULL THEN true ELSE false END as has_session
      FROM students s
      LEFT JOIN session_etudiants se ON s.id = se.student_id
      LEFT JOIN sessions_formation sf ON se.session_id = sf.id
      LEFT JOIN villes v ON sf.ville_id = v.id
      ORDER BY
        CASE WHEN se.id IS NULL THEN 0 ELSE 1 END,
        s.nom,
        s.prenom
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students with sessions:', error);
    res.status(500).json({ error: 'Error fetching students with sessions', details: error.message });
  }
});

/**
 * Get all students
 * GET /api/students
 * Protected: Requires authentication and students view permission
 */
router.get('/',
  authenticateToken,
  requirePermission('training.students.view_page'),
  async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, cin, email, phone, whatsapp,
              date_naissance, lieu_naissance, adresse, statut_compte, profile_image_url,
              created_at, updated_at
       FROM students
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Error fetching students', details: error.message });
  }
});

/**
 * Get student by ID
 * GET /api/students/:id
 * Protected: Requires authentication and students view permission
 */
router.get('/:id',
  authenticateToken,
  requirePermission('training.students.view_page'),
  async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, cin, email, phone, whatsapp,
              date_naissance, lieu_naissance, adresse, statut_compte, profile_image_url,
              created_at, updated_at
       FROM students
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Étudiant non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Error fetching student', details: error.message });
  }
});

/**
 * Update student by ID
 * PUT /api/students/:id
 * Accepts multipart/form-data with optional profile_image file
 * Protected: Requires authentication and students update permission
 */
router.put('/:id',
  authenticateToken,
  requirePermission('training.students.update'),
  uploadProfileImage,
  async (req, res) => {
  const { id } = req.params;
  const {
    nom,
    prenom,
    cin,
    email,
    phone,
    whatsapp,
    date_naissance,
    lieu_naissance,
    adresse,
    statut_compte,
  } = req.body;

  try {
    // Check if student exists
    const existingStudent = await pool.query('SELECT id, profile_image_url FROM students WHERE id = $1', [id]);

    if (existingStudent.rows.length === 0) {
      return res.status(404).json({ error: 'Étudiant non trouvé' });
    }

    // Handle profile image upload
    let profile_image_url = existingStudent.rows[0].profile_image_url;
    if (req.file) {
      // Generate URL relative to server uploads directory
      profile_image_url = `/uploads/profiles/${req.file.filename}`;

      // TODO: Delete old profile image if exists
    }

    const result = await pool.query(
      `UPDATE students SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        cin = COALESCE($3, cin),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        whatsapp = COALESCE($6, whatsapp),
        date_naissance = COALESCE($7, date_naissance),
        lieu_naissance = COALESCE($8, lieu_naissance),
        adresse = COALESCE($9, adresse),
        statut_compte = COALESCE($10, statut_compte),
        profile_image_url = COALESCE($11, profile_image_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [
        nom || null,
        prenom || null,
        cin || null,
        email || null,
        phone || null,
        whatsapp || null,
        date_naissance || null,
        lieu_naissance || null,
        adresse || null,
        statut_compte || null,
        req.file ? profile_image_url : null,
        id,
      ]
    );

    res.json({
      success: true,
      student: result.rows[0],
      message: 'Étudiant mis à jour avec succès',
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'étudiant', details: error.message });
  }
});

export default router;
