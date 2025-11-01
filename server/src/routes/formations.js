import express from 'express';
import pool from '../config/database.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// GET /api/formations/sessions - Liste toutes les sessions
router.get('/sessions', async (req, res) => {
  try {
    const query = `
      SELECT
        fs.*,
        p.full_name as instructor_name,
        COUNT(DISTINCT fe.id) as enrolled_count
      FROM formation_sessions fs
      LEFT JOIN profiles p ON fs.instructor_id = p.id
      LEFT JOIN formation_enrollments fe ON fs.id = fe.session_id AND fe.status = 'enrolled'
      GROUP BY fs.id, p.full_name
      ORDER BY fs.created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/formations/sessions/:id - Détail d'une session
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sessionQuery = `
      SELECT
        fs.*,
        p.full_name as instructor_name,
        p.username as instructor_username
      FROM formation_sessions fs
      LEFT JOIN profiles p ON fs.instructor_id = p.id
      WHERE fs.id = $1
    `;

    const sessionResult = await pool.query(sessionQuery, [id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const session = sessionResult.rows[0];

    // Récupérer les étudiants inscrits
    const studentsQuery = `
      SELECT
        fe.id as enrollment_id,
        fe.enrollment_date,
        fe.status as enrollment_status,
        fe.notes,
        p.id as student_id,
        p.full_name as student_name,
        p.username as student_username
      FROM formation_enrollments fe
      JOIN profiles p ON fe.student_id = p.id
      WHERE fe.session_id = $1
      ORDER BY fe.enrollment_date DESC
    `;

    const studentsResult = await pool.query(studentsQuery, [id]);
    session.students = studentsResult.rows;

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/formations/sessions - Créer une session
router.post('/sessions', async (req, res) => {
  try {
    const { name, description, start_date, end_date, instructor_id, max_capacity, status } = req.body;

    // Validation
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Les champs nom, date de début et date de fin sont obligatoires' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO formation_sessions
        (id, name, description, start_date, end_date, instructor_id, max_capacity, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      name,
      description || null,
      start_date,
      end_date,
      instructor_id || null,
      max_capacity || null,
      status || 'planned',
      now,
      now
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/formations/sessions/:id - Modifier une session
router.put('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, start_date, end_date, instructor_id, max_capacity, status } = req.body;

    const now = new Date().toISOString();

    const query = `
      UPDATE formation_sessions
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        instructor_id = $5,
        max_capacity = $6,
        status = COALESCE($7, status),
        updated_at = $8
      WHERE id = $9
      RETURNING *
    `;

    const values = [
      name,
      description,
      start_date,
      end_date,
      instructor_id,
      max_capacity,
      status,
      now,
      id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/formations/sessions/:id - Supprimer une session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM formation_sessions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    res.json({ message: 'Session supprimée avec succès', session: result.rows[0] });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/formations/sessions/:id/students - Liste des étudiants d'une session
router.get('/sessions/:id/students', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        fe.id as enrollment_id,
        fe.enrollment_date,
        fe.status as enrollment_status,
        fe.notes,
        p.id as student_id,
        p.full_name as student_name,
        p.username as student_username,
        p.role
      FROM formation_enrollments fe
      JOIN profiles p ON fe.student_id = p.id
      WHERE fe.session_id = $1
      ORDER BY fe.enrollment_date DESC
    `;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrolled students:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/formations/sessions/:id/enroll - Inscrire des étudiants
router.post('/sessions/:id/enroll', async (req, res) => {
  try {
    const { id } = req.params;
    const { student_ids } = req.body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'La liste des étudiants est requise' });
    }

    // Vérifier que la session existe
    const sessionCheck = await pool.query(
      'SELECT id, max_capacity FROM formation_sessions WHERE id = $1',
      [id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const session = sessionCheck.rows[0];

    // Vérifier la capacité maximale si définie
    if (session.max_capacity) {
      const enrolledCount = await pool.query(
        'SELECT COUNT(*) FROM formation_enrollments WHERE session_id = $1 AND status = $2',
        [id, 'enrolled']
      );

      const currentCount = parseInt(enrolledCount.rows[0].count);
      if (currentCount + student_ids.length > session.max_capacity) {
        return res.status(400).json({
          error: `Capacité maximale dépassée. Capacité: ${session.max_capacity}, Actuellement inscrits: ${currentCount}`
        });
      }
    }

    // Insérer les inscriptions
    const enrollments = [];
    const now = new Date().toISOString();

    for (const student_id of student_ids) {
      const enrollmentId = nanoid();

      try {
        const query = `
          INSERT INTO formation_enrollments (id, session_id, student_id, enrollment_date, status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (session_id, student_id) DO NOTHING
          RETURNING *
        `;

        const result = await pool.query(query, [enrollmentId, id, student_id, now, 'enrolled']);

        if (result.rows.length > 0) {
          enrollments.push(result.rows[0]);
        }
      } catch (error) {
        console.error(`Error enrolling student ${student_id}:`, error);
      }
    }

    res.status(201).json({
      message: `${enrollments.length} étudiant(s) inscrit(s) avec succès`,
      enrollments
    });
  } catch (error) {
    console.error('Error enrolling students:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/formations/sessions/:id/enroll/:studentId - Désinscrire un étudiant
router.delete('/sessions/:id/enroll/:studentId', async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const result = await pool.query(
      'DELETE FROM formation_enrollments WHERE session_id = $1 AND student_id = $2 RETURNING *',
      [id, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    res.json({ message: 'Étudiant désinscrit avec succès', enrollment: result.rows[0] });
  } catch (error) {
    console.error('Error unenrolling student:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/formations/available-students - Liste des étudiants disponibles (professors non inscrits à une session)
router.get('/available-students', async (req, res) => {
  try {
    const { session_id } = req.query;

    let query;
    let params = [];

    if (session_id) {
      // Étudiants non inscrits à cette session spécifique
      query = `
        SELECT id, username, full_name, role
        FROM profiles
        WHERE role = 'professor'
        AND id NOT IN (
          SELECT student_id
          FROM formation_enrollments
          WHERE session_id = $1
        )
        ORDER BY full_name
      `;
      params = [session_id];
    } else {
      // Tous les professors
      query = `
        SELECT id, username, full_name, role
        FROM profiles
        WHERE role = 'professor'
        ORDER BY full_name
      `;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/formations/stats - Statistiques globales des formations
router.get('/stats', async (req, res) => {
  try {
    const stats = {};

    // Nombre total de sessions par statut
    const sessionsQuery = `
      SELECT status, COUNT(*) as count
      FROM formation_sessions
      GROUP BY status
    `;
    const sessionsResult = await pool.query(sessionsQuery);

    stats.sessions = {
      total: 0,
      planned: 0,
      active: 0,
      completed: 0,
      cancelled: 0
    };

    sessionsResult.rows.forEach(row => {
      stats.sessions[row.status] = parseInt(row.count);
      stats.sessions.total += parseInt(row.count);
    });

    // Nombre total d'étudiants inscrits
    const enrollmentsQuery = `
      SELECT COUNT(DISTINCT student_id) as total_students
      FROM formation_enrollments
      WHERE status = 'enrolled'
    `;
    const enrollmentsResult = await pool.query(enrollmentsQuery);
    stats.total_students_enrolled = parseInt(enrollmentsResult.rows[0].total_students || 0);

    // Sessions avec le plus d'inscriptions
    const topSessionsQuery = `
      SELECT
        fs.id,
        fs.name,
        COUNT(fe.id) as enrollment_count
      FROM formation_sessions fs
      LEFT JOIN formation_enrollments fe ON fs.id = fe.session_id AND fe.status = 'enrolled'
      GROUP BY fs.id, fs.name
      ORDER BY enrollment_count DESC
      LIMIT 5
    `;
    const topSessionsResult = await pool.query(topSessionsQuery);
    stats.top_sessions = topSessionsResult.rows;

    res.json(stats);
  } catch (error) {
    console.error('Error fetching formation stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
