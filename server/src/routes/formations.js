import express from 'express';
import pool from '../config/database.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// GET /api/formations/sessions - Liste toutes les sessions (avec filtrage optionnel)
router.get('/sessions', async (req, res) => {
  try {
    const { city_id, segment_id } = req.query;

    let query = `
      SELECT
        fs.*,
        p.full_name as instructor_name,
        s.name as segment_name,
        c.name as city_name,
        COUNT(DISTINCT fe.id) as enrolled_count
      FROM formation_sessions fs
      LEFT JOIN profiles p ON fs.instructor_id = p.id
      LEFT JOIN segments s ON fs.segment_id = s.id
      LEFT JOIN cities c ON fs.city_id = c.id
      LEFT JOIN formation_enrollments fe ON fs.id = fe.session_id AND fe.status = 'enrolled'
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filtrage par city_id
    if (city_id) {
      conditions.push(`fs.city_id = $${paramIndex}`);
      params.push(city_id);
      paramIndex++;
    }

    // Filtrage par segment_id
    if (segment_id) {
      conditions.push(`fs.segment_id = $${paramIndex}`);
      params.push(segment_id);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY fs.id, p.full_name, s.name, c.name
      ORDER BY fs.created_at DESC
    `;

    const result = await pool.query(query, params);
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

    // Récupérer les informations de base de la session
    const sessionQuery = `
      SELECT
        fs.*,
        p.full_name as instructor_name,
        p.username as instructor_username,
        s.name as segment_name,
        c.name as city_name
      FROM formation_sessions fs
      LEFT JOIN profiles p ON fs.instructor_id = p.id
      LEFT JOIN segments s ON fs.segment_id = s.id
      LEFT JOIN cities c ON fs.city_id = c.id
      WHERE fs.id = $1
    `;

    const sessionResult = await pool.query(sessionQuery, [id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const session = sessionResult.rows[0];

    // Récupérer les formations associées via session_formations
    const formationsQuery = `
      SELECT
        f.id,
        f.title,
        f.description,
        f.price,
        f.duration_hours,
        f.level,
        sf.created_at as association_date
      FROM session_formations sf
      JOIN formations f ON sf.formation_id = f.id
      WHERE sf.session_id = $1
      ORDER BY sf.created_at ASC
    `;

    const formationsResult = await pool.query(formationsQuery, [id]);
    session.formations = formationsResult.rows;

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
    const { name, description, formation_ids, start_date, end_date, segment_id, city_id, instructor_id, max_capacity, status } = req.body;

    // Validation
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Les champs nom, date de début et date de fin sont obligatoires' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    // Créer la session (sans formation_id direct)
    const sessionQuery = `
      INSERT INTO formation_sessions
        (id, name, description, start_date, end_date, segment_id, city_id, instructor_id, max_capacity, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const sessionValues = [
      id,
      name,
      description || null,
      start_date,
      end_date,
      segment_id || null,
      city_id || null,
      instructor_id || null,
      max_capacity || null,
      status || 'planned',
      now,
      now
    ];

    const sessionResult = await pool.query(sessionQuery, sessionValues);
    const session = sessionResult.rows[0];

    // Insérer les formations associées si formation_ids est fourni
    if (formation_ids && Array.isArray(formation_ids) && formation_ids.length > 0) {
      for (const formation_id of formation_ids) {
        const junctionId = nanoid();
        await pool.query(
          'INSERT INTO session_formations (id, session_id, formation_id, created_at) VALUES ($1, $2, $3, $4)',
          [junctionId, id, formation_id, now]
        );
      }
    }

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/formations/sessions/:id - Modifier une session
router.put('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, formation_ids, start_date, end_date, segment_id, city_id, instructor_id, max_capacity, status } = req.body;

    const now = new Date().toISOString();

    // Mettre à jour la session (sans formation_id direct)
    const query = `
      UPDATE formation_sessions
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        segment_id = $5,
        city_id = $6,
        instructor_id = $7,
        max_capacity = $8,
        status = COALESCE($9, status),
        updated_at = $10
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      name,
      description,
      start_date,
      end_date,
      segment_id,
      city_id,
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

    // Mettre à jour les formations associées si formation_ids est fourni
    if (formation_ids !== undefined) {
      // Supprimer les anciennes associations
      await pool.query('DELETE FROM session_formations WHERE session_id = $1', [id]);

      // Insérer les nouvelles associations
      if (Array.isArray(formation_ids) && formation_ids.length > 0) {
        for (const formation_id of formation_ids) {
          const junctionId = nanoid();
          await pool.query(
            'INSERT INTO session_formations (id, session_id, formation_id, created_at) VALUES ($1, $2, $3, $4)',
            [junctionId, id, formation_id, now]
          );
        }
      }
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

// GET /api/formations/sessions/:id/students - Liste des étudiants d'une session avec calculs de paiement
router.get('/sessions/:id/students', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        fe.id as enrollment_id,
        fe.enrollment_date,
        fe.status as enrollment_status,
        fe.notes,
        fe.discount_amount,
        fe.validation_status,
        fe.validated_by,
        fe.validated_at,
        p.id as student_id,
        p.full_name as student_name,
        p.username as student_username,
        p.role,
        validator.full_name as validated_by_name,
        COALESCE(SUM(sp.amount), 0) as total_paid,
        COUNT(sp.id) as payment_count
      FROM formation_enrollments fe
      JOIN profiles p ON fe.student_id = p.id
      LEFT JOIN profiles validator ON fe.validated_by = validator.id
      LEFT JOIN student_payments sp ON fe.id = sp.enrollment_id
      WHERE fe.session_id = $1
      GROUP BY fe.id, p.id, p.full_name, p.username, p.role, validator.full_name
      ORDER BY fe.enrollment_date DESC
    `;

    const enrollments = await pool.query(query, [id]);

    // Calculer le prix des formations de cette session
    const priceQuery = `
      SELECT COALESCE(SUM(f.price), 0) as total_formation_price
      FROM session_formations sf
      JOIN formations f ON sf.formation_id = f.id
      WHERE sf.session_id = $1
    `;
    const priceResult = await pool.query(priceQuery, [id]);
    const formationPrice = parseFloat(priceResult.rows[0].total_formation_price || 0);

    // Enrichir chaque inscription avec les calculs de paiement
    const enrichedEnrollments = enrollments.rows.map(enrollment => {
      const discountAmount = parseFloat(enrollment.discount_amount || 0);
      const totalPaid = parseFloat(enrollment.total_paid || 0);
      const finalPrice = formationPrice - discountAmount;
      const remainingAmount = finalPrice - totalPaid;

      let paymentStatus = 'impaye';
      if (remainingAmount < 0) {
        paymentStatus = 'surpaye';
      } else if (remainingAmount === 0) {
        paymentStatus = 'paye';
      } else if (totalPaid > 0) {
        paymentStatus = 'partiel';
      }

      return {
        ...enrollment,
        formation_price: formationPrice,
        final_price: finalPrice,
        total_paid: totalPaid,
        remaining_amount: remainingAmount,
        payment_status: paymentStatus,
      };
    });

    res.json(enrichedEnrollments);
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

// GET /api/formations/all - Liste toutes les formations disponibles (pour multi-select)
router.get('/all', async (req, res) => {
  try {
    const { corps_id } = req.query;

    let query = `
      SELECT
        f.id,
        f.title,
        f.description,
        f.price,
        f.duration_hours,
        f.level,
        f.status,
        f.is_pack,
        f.corps_formation_id,
        cf.name as corps_formation_name,
        (
          SELECT COUNT(*)::integer
          FROM formation_pack_items fpi
          WHERE fpi.pack_id = f.id
        ) as formations_count
      FROM formations f
      LEFT JOIN corps_formation cf ON f.corps_formation_id = cf.id
      WHERE f.status = 'published'
    `;

    const params = [];

    // Filtre par corps de formation si fourni
    if (corps_id) {
      query += ' AND f.corps_formation_id = $1';
      params.push(corps_id);
    }

    query += ' ORDER BY f.is_pack DESC, f.title ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all formations:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== PAYMENT ENDPOINTS ==========

// POST /api/formations/enrollments/:id/payments - Ajouter un paiement
router.post('/enrollments/:id/payments', async (req, res) => {
  try {
    const { id: enrollment_id } = req.params;
    const { amount, payment_date, payment_method, note, created_by } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Le montant du paiement doit être supérieur à 0' });
    }

    // Vérifier que l'inscription existe
    const enrollmentCheck = await pool.query(
      'SELECT id FROM formation_enrollments WHERE id = $1',
      [enrollment_id]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const paymentId = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO student_payments
        (id, enrollment_id, amount, payment_date, payment_method, note, created_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      paymentId,
      enrollment_id,
      amount,
      payment_date || new Date().toISOString().split('T')[0], // Date du jour par défaut
      payment_method || 'especes',
      note || null,
      now,
      created_by || null
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/formations/enrollments/:id/payments - Liste tous les paiements d'une inscription
router.get('/enrollments/:id/payments', async (req, res) => {
  try {
    const { id: enrollment_id } = req.params;

    const query = `
      SELECT
        sp.*,
        p.full_name as created_by_name
      FROM student_payments sp
      LEFT JOIN profiles p ON sp.created_by = p.id
      WHERE sp.enrollment_id = $1
      ORDER BY sp.payment_date DESC, sp.created_at DESC
    `;

    const result = await pool.query(query, [enrollment_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/formations/enrollments/:id/payments/:paymentId - Supprimer un paiement
router.delete('/enrollments/:id/payments/:paymentId', async (req, res) => {
  try {
    const { id: enrollment_id, paymentId } = req.params;

    // Vérifier que le paiement existe et appartient à cette inscription
    const checkQuery = `
      SELECT id FROM student_payments
      WHERE id = $1 AND enrollment_id = $2
    `;

    const checkResult = await pool.query(checkQuery, [paymentId, enrollment_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    // Supprimer le paiement
    await pool.query('DELETE FROM student_payments WHERE id = $1', [paymentId]);

    res.json({ message: 'Paiement supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== VALIDATION ENDPOINTS ==========

// PATCH /api/formations/enrollments/:id/validation - Toggle validation status
router.patch('/enrollments/:id/validation', async (req, res) => {
  try {
    const { id: enrollment_id } = req.params;
    const { validation_status, validated_by } = req.body;

    // Validation
    if (!validation_status || !['valide', 'non_valide'].includes(validation_status)) {
      return res.status(400).json({ error: 'Le statut de validation doit être "valide" ou "non_valide"' });
    }

    // Vérifier que l'inscription existe
    const enrollmentCheck = await pool.query(
      'SELECT id FROM formation_enrollments WHERE id = $1',
      [enrollment_id]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const now = new Date().toISOString();

    // Si validé, enregistrer validated_by et validated_at
    // Si non validé, mettre ces champs à NULL
    const query = `
      UPDATE formation_enrollments
      SET
        validation_status = $1,
        validated_by = $2,
        validated_at = $3
      WHERE id = $4
      RETURNING *
    `;

    const values = [
      validation_status,
      validation_status === 'valide' ? validated_by : null,
      validation_status === 'valide' ? now : null,
      enrollment_id
    ];

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating validation status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FORMATION TEMPLATES MANAGEMENT
// ============================================================================

// GET /api/formations/:id/templates - Récupère tous les templates d'une formation
router.get('/:id/templates', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        ft.id,
        ft.formation_id,
        ft.template_id,
        ft.document_type,
        ft.is_default,
        ft.created_at,
        ct.name as template_name,
        ct.description as template_description,
        ct.folder_id,
        ct.preview_image_url,
        ct.background_image_url
      FROM formation_templates ft
      JOIN certificate_templates ct ON ft.template_id = ct.id
      WHERE ft.formation_id = $1
      ORDER BY ft.is_default DESC, ft.created_at ASC
    `;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching formation templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/formations/:id/templates - Ajoute des templates à une formation
router.post('/:id/templates', async (req, res) => {
  try {
    const { id: formation_id } = req.params;
    const { template_ids, document_type = 'certificat' } = req.body;

    // Validation
    if (!template_ids || !Array.isArray(template_ids) || template_ids.length === 0) {
      return res.status(400).json({ error: 'template_ids doit être un tableau non vide' });
    }

    if (!['certificat', 'attestation', 'diplome', 'autre'].includes(document_type)) {
      return res.status(400).json({ error: 'document_type invalide' });
    }

    // Vérifier si la formation existe
    const formationCheck = await pool.query(
      'SELECT id FROM formations WHERE id = $1',
      [formation_id]
    );

    if (formationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    // Vérifier si c'est le premier template (sera is_default)
    const existingTemplatesQuery = await pool.query(
      'SELECT COUNT(*) as count FROM formation_templates WHERE formation_id = $1',
      [formation_id]
    );
    const isFirstTemplate = parseInt(existingTemplatesQuery.rows[0].count) === 0;

    // Insérer les templates
    const insertedTemplates = [];
    for (let i = 0; i < template_ids.length; i++) {
      const template_id = template_ids[i];
      const is_default = isFirstTemplate && i === 0; // Le premier template du premier batch est default

      try {
        const insertQuery = `
          INSERT INTO formation_templates (id, formation_id, template_id, document_type, is_default)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (formation_id, template_id, document_type) DO UPDATE
          SET is_default = EXCLUDED.is_default
          RETURNING *
        `;

        const result = await pool.query(insertQuery, [
          nanoid(),
          formation_id,
          template_id,
          document_type,
          is_default
        ]);

        insertedTemplates.push(result.rows[0]);
      } catch (err) {
        console.error(`Error inserting template ${template_id}:`, err);
        // Continue with other templates
      }
    }

    // Mettre à jour le champ legacy certificate_template_id avec le premier template default
    if (insertedTemplates.some(t => t.is_default)) {
      const defaultTemplate = insertedTemplates.find(t => t.is_default);
      await pool.query(
        'UPDATE formations SET certificate_template_id = $1 WHERE id = $2',
        [defaultTemplate.template_id, formation_id]
      );
    }

    res.json({ success: true, templates: insertedTemplates });
  } catch (error) {
    console.error('Error adding formation templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/formations/:id/templates/:templateId - Supprime un template d'une formation
router.delete('/:id/templates/:templateId', async (req, res) => {
  try {
    const { id: formation_id, templateId: template_id } = req.params;

    // Vérifier si le template est le default
    const checkQuery = await pool.query(
      'SELECT is_default FROM formation_templates WHERE formation_id = $1 AND template_id = $2',
      [formation_id, template_id]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Association template-formation non trouvée' });
    }

    const wasDefault = checkQuery.rows[0].is_default;

    // Supprimer l'association
    await pool.query(
      'DELETE FROM formation_templates WHERE formation_id = $1 AND template_id = $2',
      [formation_id, template_id]
    );

    // Si c'était le default, promouvoir le prochain template
    if (wasDefault) {
      const nextTemplateQuery = await pool.query(
        'SELECT template_id FROM formation_templates WHERE formation_id = $1 ORDER BY created_at ASC LIMIT 1',
        [formation_id]
      );

      if (nextTemplateQuery.rows.length > 0) {
        const new_default_id = nextTemplateQuery.rows[0].template_id;

        // Mettre à jour le nouveau default
        await pool.query(
          'UPDATE formation_templates SET is_default = true WHERE formation_id = $1 AND template_id = $2',
          [formation_id, new_default_id]
        );

        // Mettre à jour le champ legacy
        await pool.query(
          'UPDATE formations SET certificate_template_id = $1 WHERE id = $2',
          [new_default_id, formation_id]
        );
      } else {
        // Aucun template restant, clear le champ legacy
        await pool.query(
          'UPDATE formations SET certificate_template_id = NULL WHERE id = $1',
          [formation_id]
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing formation template:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/formations/:id/templates/:templateId/default - Définit un template comme default
router.put('/:id/templates/:templateId/default', async (req, res) => {
  try {
    const { id: formation_id, templateId: template_id } = req.params;

    // Vérifier que l'association existe
    const checkQuery = await pool.query(
      'SELECT id FROM formation_templates WHERE formation_id = $1 AND template_id = $2',
      [formation_id, template_id]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Association template-formation non trouvée' });
    }

    // Retirer is_default de tous les templates de cette formation
    await pool.query(
      'UPDATE formation_templates SET is_default = false WHERE formation_id = $1',
      [formation_id]
    );

    // Définir le nouveau default
    await pool.query(
      'UPDATE formation_templates SET is_default = true WHERE formation_id = $1 AND template_id = $2',
      [formation_id, template_id]
    );

    // Mettre à jour le champ legacy
    await pool.query(
      'UPDATE formations SET certificate_template_id = $1 WHERE id = $2',
      [template_id, formation_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting default template:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
