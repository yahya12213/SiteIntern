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
 * Check if student with CIN already exists
 * GET /api/students/check-cin/:cin
 */
router.get('/check-cin/:cin', async (req, res) => {
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
 */
router.post('/', async (req, res) => {
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

    // TODO: Handle profile image upload
    // For now, profile_image_url is optional
    const profile_image_url = null;

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
 * Get all students
 * GET /api/students
 */
router.get('/', async (req, res) => {
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
 */
router.get('/:id', async (req, res) => {
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

export default router;
