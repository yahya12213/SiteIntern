import express from 'express';
import pool from '../config/database.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// ============================================
// FORMATIONS CRUD
// ============================================

// GET /api/cours/formations - Liste toutes les formations
router.get('/formations', async (req, res) => {
  try {
    const query = `
      SELECT
        f.*,
        COUNT(DISTINCT fm.id) as module_count
      FROM formations f
      LEFT JOIN formation_modules fm ON f.id = fm.formation_id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching formations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cours/formations/:id - Détail d'une formation
router.get('/formations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const formationQuery = `
      SELECT * FROM formations WHERE id = $1
    `;
    const formationResult = await pool.query(formationQuery, [id]);

    if (formationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    const formation = formationResult.rows[0];

    // Récupérer les modules avec leurs contenus
    const modulesQuery = `
      SELECT
        fm.*,
        COALESCE(
          JSON_AGG(
            DISTINCT jsonb_build_object(
              'id', mv.id,
              'title', mv.title,
              'youtube_url', mv.youtube_url,
              'duration_seconds', mv.duration_seconds,
              'description', mv.description,
              'order_index', mv.order_index
            )
          ) FILTER (WHERE mv.id IS NOT NULL),
          '[]'
        ) as videos,
        COALESCE(
          JSON_AGG(
            DISTINCT jsonb_build_object(
              'id', mt.id,
              'title', mt.title,
              'description', mt.description,
              'passing_score', mt.passing_score,
              'time_limit_minutes', mt.time_limit_minutes,
              'max_attempts', mt.max_attempts,
              'show_correct_answers', mt.show_correct_answers
            )
          ) FILTER (WHERE mt.id IS NOT NULL),
          '[]'
        ) as tests
      FROM formation_modules fm
      LEFT JOIN module_videos mv ON fm.id = mv.module_id
      LEFT JOIN module_tests mt ON fm.id = mt.module_id
      WHERE fm.formation_id = $1
      GROUP BY fm.id
      ORDER BY fm.order_index
    `;
    const modulesResult = await pool.query(modulesQuery, [id]);

    formation.modules = modulesResult.rows;

    res.json(formation);
  } catch (error) {
    console.error('Error fetching formation:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cours/formations - Créer une formation
router.post('/formations', async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      duration_hours,
      level,
      thumbnail_url,
      status,
      passing_score_percentage
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Le titre est obligatoire' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO formations (
        id, title, description, price, duration_hours, level,
        thumbnail_url, status, passing_score_percentage,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id, title, description, price, duration_hours, level,
      thumbnail_url, status || 'draft', passing_score_percentage || 80,
      now, now
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating formation:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cours/formations/:id - Modifier une formation
router.put('/formations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      duration_hours,
      level,
      thumbnail_url,
      status,
      passing_score_percentage
    } = req.body;

    const now = new Date().toISOString();

    const query = `
      UPDATE formations
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        duration_hours = COALESCE($4, duration_hours),
        level = COALESCE($5, level),
        thumbnail_url = COALESCE($6, thumbnail_url),
        status = COALESCE($7, status),
        passing_score_percentage = COALESCE($8, passing_score_percentage),
        updated_at = $9
      WHERE id = $10
      RETURNING *
    `;

    const values = [
      title, description, price, duration_hours, level,
      thumbnail_url, status, passing_score_percentage,
      now, id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating formation:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cours/formations/:id - Supprimer une formation
router.delete('/formations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM formations WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    res.json({ message: 'Formation supprimée avec succès', formation: result.rows[0] });
  } catch (error) {
    console.error('Error deleting formation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MODULES CRUD
// ============================================

// GET /api/cours/formations/:formationId/modules - Liste modules d'une formation
router.get('/formations/:formationId/modules', async (req, res) => {
  try {
    const { formationId } = req.params;

    const query = `
      SELECT * FROM formation_modules
      WHERE formation_id = $1
      ORDER BY order_index
    `;

    const result = await pool.query(query, [formationId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cours/formations/:formationId/modules - Ajouter un module
router.post('/formations/:formationId/modules', async (req, res) => {
  try {
    const { formationId } = req.params;
    const {
      title,
      description,
      order_index,
      prerequisite_module_id,
      module_type
    } = req.body;

    if (!title || !module_type) {
      return res.status(400).json({ error: 'Titre et type de module obligatoires' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO formation_modules (
        id, formation_id, title, description, order_index,
        prerequisite_module_id, module_type, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      id, formationId, title, description, order_index || 0,
      prerequisite_module_id || null, module_type, now
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cours/modules/:id - Modifier un module
router.put('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      order_index,
      prerequisite_module_id,
      module_type
    } = req.body;

    const query = `
      UPDATE formation_modules
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        order_index = COALESCE($3, order_index),
        prerequisite_module_id = $4,
        module_type = COALESCE($5, module_type)
      WHERE id = $6
      RETURNING *
    `;

    const values = [title, description, order_index, prerequisite_module_id, module_type, id];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cours/modules/:id - Supprimer un module
router.delete('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM formation_modules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé' });
    }

    res.json({ message: 'Module supprimé avec succès', module: result.rows[0] });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cours/modules/:id/reorder - Réorganiser l'ordre d'un module
router.put('/modules/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_order_index } = req.body;

    if (new_order_index === undefined) {
      return res.status(400).json({ error: 'new_order_index requis' });
    }

    const query = `
      UPDATE formation_modules
      SET order_index = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [new_order_index, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error reordering module:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VIDÉOS CRUD
// ============================================

// POST /api/cours/modules/:moduleId/videos - Ajouter une vidéo
router.post('/modules/:moduleId/videos', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const {
      title,
      youtube_url,
      duration_seconds,
      description,
      order_index
    } = req.body;

    if (!title || !youtube_url) {
      return res.status(400).json({ error: 'Titre et URL YouTube obligatoires' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO module_videos (
        id, module_id, title, youtube_url, duration_seconds,
        description, order_index, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      id, moduleId, title, youtube_url, duration_seconds,
      description, order_index || 0, now
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cours/videos/:id - Modifier une vidéo
router.put('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      youtube_url,
      duration_seconds,
      description,
      order_index
    } = req.body;

    const query = `
      UPDATE module_videos
      SET
        title = COALESCE($1, title),
        youtube_url = COALESCE($2, youtube_url),
        duration_seconds = COALESCE($3, duration_seconds),
        description = COALESCE($4, description),
        order_index = COALESCE($5, order_index)
      WHERE id = $6
      RETURNING *
    `;

    const values = [title, youtube_url, duration_seconds, description, order_index, id];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cours/videos/:id - Supprimer une vidéo
router.delete('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM module_videos WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }

    res.json({ message: 'Vidéo supprimée avec succès', video: result.rows[0] });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TESTS CRUD
// ============================================

// POST /api/cours/modules/:moduleId/tests - Créer un test
router.post('/modules/:moduleId/tests', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const {
      title,
      description,
      passing_score,
      time_limit_minutes,
      max_attempts,
      show_correct_answers
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Titre obligatoire' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO module_tests (
        id, module_id, title, description, passing_score,
        time_limit_minutes, max_attempts, show_correct_answers, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      id, moduleId, title, description, passing_score || 80,
      time_limit_minutes, max_attempts, show_correct_answers !== false, now
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cours/tests/:id - Détail d'un test avec questions
router.get('/tests/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const testQuery = 'SELECT * FROM module_tests WHERE id = $1';
    const testResult = await pool.query(testQuery, [id]);

    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test non trouvé' });
    }

    const test = testResult.rows[0];

    // Récupérer les questions avec leurs choix
    const questionsQuery = `
      SELECT
        tq.*,
        COALESCE(
          JSON_AGG(
            jsonb_build_object(
              'id', qc.id,
              'choice_text', qc.choice_text,
              'is_correct', qc.is_correct,
              'order_index', qc.order_index
            ) ORDER BY qc.order_index
          ) FILTER (WHERE qc.id IS NOT NULL),
          '[]'
        ) as choices
      FROM test_questions tq
      LEFT JOIN question_choices qc ON tq.id = qc.question_id
      WHERE tq.test_id = $1
      GROUP BY tq.id
      ORDER BY tq.order_index
    `;

    const questionsResult = await pool.query(questionsQuery, [id]);
    test.questions = questionsResult.rows;

    res.json(test);
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cours/tests/:id - Modifier un test
router.put('/tests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      passing_score,
      time_limit_minutes,
      max_attempts,
      show_correct_answers
    } = req.body;

    const query = `
      UPDATE module_tests
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        passing_score = COALESCE($3, passing_score),
        time_limit_minutes = $4,
        max_attempts = $5,
        show_correct_answers = COALESCE($6, show_correct_answers)
      WHERE id = $7
      RETURNING *
    `;

    const values = [
      title, description, passing_score, time_limit_minutes,
      max_attempts, show_correct_answers, id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cours/tests/:id - Supprimer un test
router.delete('/tests/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM module_tests WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test non trouvé' });
    }

    res.json({ message: 'Test supprimé avec succès', test: result.rows[0] });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// QUESTIONS CRUD
// ============================================

// POST /api/cours/tests/:testId/questions - Ajouter une question
router.post('/tests/:testId/questions', async (req, res) => {
  try {
    const { testId } = req.params;
    const {
      question_text,
      question_type,
      points,
      order_index
    } = req.body;

    if (!question_text) {
      return res.status(400).json({ error: 'Texte de la question obligatoire' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO test_questions (
        id, test_id, question_text, question_type, points, order_index, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      id, testId, question_text, question_type || 'multiple_choice',
      points || 1, order_index || 0, now
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cours/questions/:id - Modifier une question
router.put('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      question_text,
      question_type,
      points,
      order_index
    } = req.body;

    const query = `
      UPDATE test_questions
      SET
        question_text = COALESCE($1, question_text),
        question_type = COALESCE($2, question_type),
        points = COALESCE($3, points),
        order_index = COALESCE($4, order_index)
      WHERE id = $5
      RETURNING *
    `;

    const values = [question_text, question_type, points, order_index, id];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cours/questions/:id - Supprimer une question
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM test_questions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }

    res.json({ message: 'Question supprimée avec succès', question: result.rows[0] });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CHOIX DE RÉPONSE CRUD
// ============================================

// POST /api/cours/questions/:questionId/choices - Ajouter un choix
router.post('/questions/:questionId/choices', async (req, res) => {
  try {
    const { questionId } = req.params;
    const {
      choice_text,
      is_correct,
      order_index
    } = req.body;

    if (!choice_text) {
      return res.status(400).json({ error: 'Texte du choix obligatoire' });
    }

    const id = nanoid();

    const query = `
      INSERT INTO question_choices (
        id, question_id, choice_text, is_correct, order_index
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      id, questionId, choice_text, is_correct || false, order_index || 0
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating choice:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cours/choices/:id - Modifier un choix
router.put('/choices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      choice_text,
      is_correct,
      order_index
    } = req.body;

    const query = `
      UPDATE question_choices
      SET
        choice_text = COALESCE($1, choice_text),
        is_correct = COALESCE($2, is_correct),
        order_index = COALESCE($3, order_index)
      WHERE id = $4
      RETURNING *
    `;

    const values = [choice_text, is_correct, order_index, id];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Choix non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating choice:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cours/choices/:id - Supprimer un choix
router.delete('/choices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM question_choices WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Choix non trouvé' });
    }

    res.json({ message: 'Choix supprimé avec succès', choice: result.rows[0] });
  } catch (error) {
    console.error('Error deleting choice:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATISTIQUES
// ============================================

// GET /api/cours/stats - Statistiques globales
router.get('/stats', async (req, res) => {
  try {
    const stats = {};

    // Nombre de formations par statut
    const formationsQuery = `
      SELECT status, COUNT(*) as count
      FROM formations
      GROUP BY status
    `;
    const formationsResult = await pool.query(formationsQuery);

    stats.formations = {
      total: 0,
      draft: 0,
      published: 0
    };

    formationsResult.rows.forEach(row => {
      stats.formations[row.status] = parseInt(row.count);
      stats.formations.total += parseInt(row.count);
    });

    // Nombre total de modules
    const modulesQuery = 'SELECT COUNT(*) as count FROM formation_modules';
    const modulesResult = await pool.query(modulesQuery);
    stats.total_modules = parseInt(modulesResult.rows[0].count);

    // Nombre total de vidéos
    const videosQuery = 'SELECT COUNT(*) as count FROM module_videos';
    const videosResult = await pool.query(videosQuery);
    stats.total_videos = parseInt(videosResult.rows[0].count);

    // Nombre total de tests
    const testsQuery = 'SELECT COUNT(*) as count FROM module_tests';
    const testsResult = await pool.query(testsQuery);
    stats.total_tests = parseInt(testsResult.rows[0].count);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching cours stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
