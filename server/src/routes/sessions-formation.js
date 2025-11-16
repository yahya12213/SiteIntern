import express from 'express';
import pool from '../config/database.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// ============================================
// SESSIONS DE FORMATION (CLASSES)
// ============================================

/**
 * GET /api/sessions-formation
 * Liste toutes les sessions de formation avec leurs statistiques
 */
router.get('/', async (req, res) => {
  try {
    const { ville_id, segment_id, corps_formation_id, statut, annee } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (ville_id) {
      whereConditions.push(`sf.ville_id = $${paramIndex++}`);
      params.push(ville_id);
    }

    if (segment_id) {
      whereConditions.push(`sf.segment_id = $${paramIndex++}`);
      params.push(segment_id);
    }

    if (corps_formation_id) {
      whereConditions.push(`sf.corps_formation_id = $${paramIndex++}`);
      params.push(corps_formation_id);
    }

    if (statut) {
      whereConditions.push(`sf.statut = $${paramIndex++}`);
      params.push(statut);
    }

    if (annee) {
      whereConditions.push(`EXTRACT(YEAR FROM sf.date_debut) = $${paramIndex++}`);
      params.push(annee);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const query = `
      SELECT
        sf.*,
        c.name as ville_name,
        s.name as segment_name,
        s.color as segment_color,
        cf.name as corps_formation_name,
        cf.description as corps_formation_description,
        COUNT(DISTINCT se.id) as nombre_etudiants,
        COUNT(DISTINCT sp.id) as nombre_professeurs,
        COALESCE(SUM(se.montant_paye), 0) as total_paye,
        COALESCE(SUM(se.montant_du), 0) as total_du
      FROM sessions_formation sf
      LEFT JOIN cities c ON c.id = sf.ville_id
      LEFT JOIN segments s ON s.id = sf.segment_id
      LEFT JOIN corps_formation cf ON cf.id = sf.corps_formation_id
      LEFT JOIN session_etudiants se ON se.session_id = sf.id
      LEFT JOIN session_professeurs sp ON sp.session_id = sf.id
      ${whereClause}
      GROUP BY sf.id, c.name, s.name, s.color, cf.name, cf.description
      ORDER BY sf.date_debut DESC NULLS LAST, sf.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      sessions: result.rows
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions-formation/:id
 * Récupère une session avec tous ses détails
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Session principale
    const sessionQuery = `
      SELECT
        sf.*,
        c.name as ville_name,
        s.name as segment_name,
        s.color as segment_color,
        cf.name as corps_formation_name,
        cf.description as corps_formation_description,
        COUNT(DISTINCT se.id) as nombre_etudiants,
        COUNT(DISTINCT sp.id) as nombre_professeurs,
        COALESCE(SUM(se.montant_paye), 0) as total_paye,
        COALESCE(SUM(se.montant_du), 0) as total_du
      FROM sessions_formation sf
      LEFT JOIN cities c ON c.id = sf.ville_id
      LEFT JOIN segments s ON s.id = sf.segment_id
      LEFT JOIN corps_formation cf ON cf.id = sf.corps_formation_id
      LEFT JOIN session_etudiants se ON se.session_id = sf.id
      LEFT JOIN session_professeurs sp ON sp.session_id = sf.id
      WHERE sf.id = $1
      GROUP BY sf.id, c.name, s.name, s.color, cf.name, cf.description
    `;

    const sessionResult = await pool.query(sessionQuery, [id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const session = sessionResult.rows[0];

    // Étudiants
    const etudiantsQuery = `
      SELECT
        se.*,
        CONCAT(s.nom, ' ', s.prenom) as student_name,
        s.email as student_email,
        s.phone as student_phone,
        s.cin as student_cin,
        s.profile_image_url as profile_image_url,
        f.title as formation_title,
        f.is_pack as formation_is_pack
      FROM session_etudiants se
      LEFT JOIN students s ON s.id = se.student_id
      LEFT JOIN formations f ON f.id = se.formation_id
      WHERE se.session_id = $1
      ORDER BY se.date_inscription DESC
    `;
    const etudiantsResult = await pool.query(etudiantsQuery, [id]);

    // Professeurs
    const professeursQuery = `
      SELECT
        sp.*
      FROM session_professeurs sp
      WHERE sp.session_id = $1
      ORDER BY sp.date_affectation DESC
    `;
    const professeursResult = await pool.query(professeursQuery, [id]);

    // Fichiers
    const fichiersQuery = `
      SELECT * FROM session_fichiers
      WHERE session_id = $1
      ORDER BY created_at DESC
    `;
    const fichiersResult = await pool.query(fichiersQuery, [id]);

    // Statistiques détaillées
    const statsQuery = `
      SELECT
        COUNT(*) as nombre_etudiants,
        sf.prix_total,
        COALESCE(SUM(se.montant_paye), 0) as total_paye,
        COALESCE(SUM(CASE WHEN se.statut_paiement = 'partiellement_paye' THEN se.montant_paye ELSE 0 END), 0) as total_partiellement_paye,
        COALESCE(SUM(se.montant_du), 0) as total_impaye,
        COUNT(CASE WHEN se.statut_paiement = 'paye' THEN 1 END) as nombre_payes,
        COUNT(CASE WHEN se.statut_paiement = 'partiellement_paye' THEN 1 END) as nombre_partiellement_payes,
        COUNT(CASE WHEN se.statut_paiement = 'impaye' THEN 1 END) as nombre_impayes
      FROM sessions_formation sf
      LEFT JOIN session_etudiants se ON se.session_id = sf.id
      WHERE sf.id = $1
      GROUP BY sf.id, sf.prix_total
    `;
    const statsResult = await pool.query(statsQuery, [id]);
    const stats = statsResult.rows[0] || {};

    // Calcul du pourcentage payé
    const totalAttendu = parseFloat(session.prix_total) * parseInt(stats.nombre_etudiants || 0);
    stats.pourcentage_paye = totalAttendu > 0
      ? (parseFloat(stats.total_paye) / totalAttendu) * 100
      : 0;

    res.json({
      success: true,
      session: {
        ...session,
        etudiants: etudiantsResult.rows,
        professeurs: professeursResult.rows,
        fichiers: fichiersResult.rows,
        statistiques: stats
      }
    });

  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sessions-formation
 * Créer une nouvelle session
 */
router.post('/', async (req, res) => {
  try {
    const {
      titre,
      description,
      date_debut,
      date_fin,
      ville_id,
      segment_id,
      corps_formation_id,
      statut = 'planifiee',
      prix_total = 0,
      nombre_places = 0
    } = req.body;

    // Validation
    if (!titre || titre.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Le titre est obligatoire'
      });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO sessions_formation (
        id, titre, description, date_debut, date_fin,
        ville_id, segment_id, corps_formation_id, statut,
        prix_total, nombre_places, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      id, titre, description, date_debut, date_fin,
      ville_id, segment_id, corps_formation_id, statut,
      prix_total, nombre_places, now, now
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      session: result.rows[0],
      message: 'Session créée avec succès'
    });

  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/sessions-formation/:id
 * Modifier une session
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre,
      description,
      date_debut,
      date_fin,
      ville_id,
      segment_id,
      corps_formation_id,
      statut,
      prix_total,
      nombre_places
    } = req.body;

    // Vérifier que la session existe
    const checkResult = await pool.query(
      'SELECT id FROM sessions_formation WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const now = new Date().toISOString();

    const query = `
      UPDATE sessions_formation
      SET
        titre = COALESCE($1, titre),
        description = COALESCE($2, description),
        date_debut = COALESCE($3, date_debut),
        date_fin = COALESCE($4, date_fin),
        ville_id = COALESCE($5, ville_id),
        segment_id = COALESCE($6, segment_id),
        corps_formation_id = COALESCE($7, corps_formation_id),
        statut = COALESCE($8, statut),
        prix_total = COALESCE($9, prix_total),
        nombre_places = COALESCE($10, nombre_places),
        updated_at = $11
      WHERE id = $12
      RETURNING *
    `;

    const values = [
      titre, description, date_debut, date_fin,
      ville_id, segment_id, corps_formation_id, statut,
      prix_total, nombre_places, now, id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      session: result.rows[0],
      message: 'Session modifiée avec succès'
    });

  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/sessions-formation/:id
 * Supprimer une session
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM sessions_formation WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session supprimée avec succès'
    });

  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GESTION DES ÉTUDIANTS DANS UNE SESSION
// ============================================

/**
 * POST /api/sessions-formation/:id/etudiants
 * Ajouter un étudiant à une session
 */
router.post('/:id/etudiants', async (req, res) => {
  try {
    const { id: session_id } = req.params;
    const {
      student_id,
      formation_id,
      montant_total,
      montant_paye = 0,
      numero_bon,
      centre_id,
      classe_id,
      statut_paiement = 'impaye',
      discount_percentage = 0
    } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: 'student_id est obligatoire'
      });
    }

    if (!formation_id) {
      return res.status(400).json({
        success: false,
        error: 'formation_id est obligatoire - veuillez choisir une formation'
      });
    }

    // Vérifier que la session existe et récupérer son corps_formation_id
    const sessionResult = await pool.query(
      'SELECT corps_formation_id FROM sessions_formation WHERE id = $1',
      [session_id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const { corps_formation_id } = sessionResult.rows[0];

    // Vérifier que la formation appartient au corps de formation de la session
    // ET récupérer le prix de la formation
    let formationPrice = 0;
    if (corps_formation_id) {
      const formationResult = await pool.query(
        'SELECT id, price FROM formations WHERE id = $1 AND corps_formation_id = $2',
        [formation_id, corps_formation_id]
      );

      if (formationResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'La formation sélectionnée n\'appartient pas au corps de formation de cette session'
        });
      }

      formationPrice = parseFloat(formationResult.rows[0].price) || 0;
    } else {
      // Si pas de corps_formation_id, récupérer quand même le prix
      const formationResult = await pool.query(
        'SELECT price FROM formations WHERE id = $1',
        [formation_id]
      );

      if (formationResult.rows.length > 0) {
        formationPrice = parseFloat(formationResult.rows[0].price) || 0;
      }
    }

    // Vérifier que l'étudiant n'est pas déjà inscrit
    const checkExisting = await pool.query(
      'SELECT id FROM session_etudiants WHERE session_id = $1 AND student_id = $2',
      [session_id, student_id]
    );

    if (checkExisting.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'L\'étudiant est déjà inscrit à cette session'
      });
    }

    const inscriptionId = nanoid();
    const now = new Date().toISOString();

    // Calculer remise et prix final
    const formation_original_price = montant_total || formationPrice;
    const discount_pct = parseFloat(discount_percentage) || 0;
    const discount_amount = (formation_original_price * discount_pct) / 100;
    const final_montant_total = formation_original_price - discount_amount;
    const montant_du = final_montant_total - (montant_paye || 0);

    const query = `
      INSERT INTO session_etudiants (
        id, session_id, student_id, formation_id, statut_paiement,
        montant_total, montant_paye, montant_du,
        discount_percentage, discount_amount, formation_original_price,
        centre_id, classe_id, numero_bon,
        date_inscription, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      inscriptionId, session_id, student_id, formation_id, statut_paiement,
      final_montant_total, montant_paye || 0, montant_du,
      discount_pct, discount_amount, formation_original_price,
      centre_id || null, classe_id || null, numero_bon || null,
      now, now, now
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      inscription: result.rows[0],
      message: 'Étudiant ajouté à la session avec succès'
    });

  } catch (error) {
    console.error('Error adding student to session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/sessions-formation/:sessionId/etudiants/:etudiantId
 * Modifier l'inscription d'un étudiant (paiement)
 */
router.put('/:sessionId/etudiants/:etudiantId', async (req, res) => {
  try {
    const { sessionId, etudiantId } = req.params;
    const { statut_paiement, montant_paye, discount_percentage, discount_reason } = req.body;

    const now = new Date().toISOString();

    // Récupérer les données actuelles incluant formation_original_price
    const currentResult = await pool.query(
      'SELECT montant_total, discount_amount, discount_percentage, formation_original_price, montant_paye FROM session_etudiants WHERE session_id = $1 AND student_id = $2',
      [sessionId, etudiantId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Inscription not found'
      });
    }

    let montant_total = parseFloat(currentResult.rows[0].montant_total);
    const current_discount_amount = parseFloat(currentResult.rows[0].discount_amount) || 0;
    const current_discount_percentage = parseFloat(currentResult.rows[0].discount_percentage) || 0;
    const current_montant_paye = parseFloat(currentResult.rows[0].montant_paye) || 0;
    const formation_original_price = parseFloat(currentResult.rows[0].formation_original_price) || (montant_total + current_discount_amount);

    // Si un nouveau pourcentage de remise est fourni, recalculer
    let new_discount_percentage = discount_percentage !== undefined ? parseFloat(discount_percentage) : null;
    let new_discount_amount = null;

    if (new_discount_percentage !== null) {
      // Calculer le nouveau montant de remise depuis le pourcentage
      new_discount_amount = (formation_original_price * new_discount_percentage) / 100;
      // Recalculer le montant_total
      montant_total = formation_original_price - new_discount_amount;
    }

    const new_montant_paye = montant_paye !== undefined ? parseFloat(montant_paye) : null;
    // Recalculer montant_du si on change le discount OU si on change le montant_paye
    let montant_du = null;
    if (new_montant_paye !== null) {
      montant_du = montant_total - new_montant_paye;
    } else if (new_discount_percentage !== null) {
      // Si on change le discount mais pas le montant_paye, recalculer montant_du avec le montant_paye actuel
      montant_du = montant_total - current_montant_paye;
    }

    // Déterminer automatiquement le statut si montant_paye fourni ou si discount change
    let new_statut = statut_paiement;
    if (new_montant_paye !== null) {
      if (new_montant_paye >= montant_total) {
        new_statut = 'paye';
      } else if (new_montant_paye > 0) {
        new_statut = 'partiellement_paye';
      } else {
        new_statut = 'impaye';
      }
    } else if (new_discount_percentage !== null) {
      // Recalculer le statut basé sur le montant_paye actuel et le nouveau total
      if (current_montant_paye >= montant_total) {
        new_statut = 'paye';
      } else if (current_montant_paye > 0) {
        new_statut = 'partiellement_paye';
      } else {
        new_statut = 'impaye';
      }
    }

    const query = `
      UPDATE session_etudiants
      SET
        statut_paiement = COALESCE($1, statut_paiement),
        montant_paye = COALESCE($2, montant_paye),
        montant_du = COALESCE($3, montant_du),
        discount_percentage = COALESCE($4, discount_percentage),
        discount_amount = COALESCE($5, discount_amount),
        discount_reason = COALESCE($6, discount_reason),
        montant_total = COALESCE($7, montant_total),
        updated_at = $8
      WHERE session_id = $9 AND student_id = $10
      RETURNING *
    `;

    const values = [
      new_statut,
      new_montant_paye,
      montant_du,
      new_discount_percentage,
      new_discount_amount,
      discount_reason,
      new_discount_percentage !== null ? montant_total : null,
      now,
      sessionId,
      etudiantId
    ];
    const result = await pool.query(query, values);

    res.json({
      success: true,
      inscription: result.rows[0],
      message: 'Inscription mise à jour avec succès'
    });

  } catch (error) {
    console.error('Error updating student inscription:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/sessions-formation/:sessionId/etudiants/:etudiantId
 * Retirer un étudiant d'une session
 */
router.delete('/:sessionId/etudiants/:etudiantId', async (req, res) => {
  try {
    const { sessionId, etudiantId } = req.params;

    const result = await pool.query(
      'DELETE FROM session_etudiants WHERE session_id = $1 AND student_id = $2 RETURNING *',
      [sessionId, etudiantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Inscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Étudiant retiré de la session avec succès'
    });

  } catch (error) {
    console.error('Error removing student from session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/sessions-formation/:sessionId/etudiants/bulk-status
 * Mettre à jour le statut de plusieurs étudiants en une seule requête
 */
router.put('/:sessionId/etudiants/bulk-status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { student_ids, status } = req.body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'student_ids doit être un tableau non vide'
      });
    }

    if (!status || !['valide', 'abandonne'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'status doit être "valide" ou "abandonne"'
      });
    }

    // Vérifier que la session existe
    const sessionCheck = await pool.query(
      'SELECT id FROM sessions_formation WHERE id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Mettre à jour le statut pour tous les étudiants sélectionnés
    const result = await pool.query(
      `UPDATE session_etudiants
       SET student_status = $1, updated_at = NOW()
       WHERE session_id = $2 AND student_id = ANY($3)
       RETURNING student_id`,
      [status, sessionId, student_ids]
    );

    const updatedCount = result.rows.length;

    res.json({
      success: true,
      updated_count: updatedCount,
      message: `${updatedCount} étudiant(s) mis à jour avec le statut "${status}"`,
      updated_ids: result.rows.map(r => r.student_id)
    });

  } catch (error) {
    console.error('Error updating bulk student status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GESTION DES PROFESSEURS DANS UNE SESSION
// ============================================

/**
 * POST /api/sessions-formation/:id/professeurs
 * Affecter un professeur à une session
 */
router.post('/:id/professeurs', async (req, res) => {
  try {
    const { id: session_id } = req.params;
    const { professeur_id } = req.body;

    if (!professeur_id) {
      return res.status(400).json({
        success: false,
        error: 'professeur_id est obligatoire'
      });
    }

    // Vérifier que le professeur n'est pas déjà affecté
    const checkExisting = await pool.query(
      'SELECT id FROM session_professeurs WHERE session_id = $1 AND professeur_id = $2',
      [session_id, professeur_id]
    );

    if (checkExisting.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Le professeur est déjà affecté à cette session'
      });
    }

    const affectationId = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO session_professeurs (
        id, session_id, professeur_id, date_affectation,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [affectationId, session_id, professeur_id, now, now, now];
    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      affectation: result.rows[0],
      message: 'Professeur affecté à la session avec succès'
    });

  } catch (error) {
    console.error('Error adding professor to session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/sessions-formation/:sessionId/professeurs/:professeurId
 * Retirer un professeur d'une session
 */
router.delete('/:sessionId/professeurs/:professeurId', async (req, res) => {
  try {
    const { sessionId, professeurId } = req.params;

    const result = await pool.query(
      'DELETE FROM session_professeurs WHERE session_id = $1 AND professeur_id = $2 RETURNING *',
      [sessionId, professeurId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Affectation not found'
      });
    }

    res.json({
      success: true,
      message: 'Professeur retiré de la session avec succès'
    });

  } catch (error) {
    console.error('Error removing professor from session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GESTION DES FICHIERS (TESTS ET PRÉSENCES)
// ============================================

/**
 * POST /api/sessions-formation/:id/fichiers
 * Ajouter un fichier (test ou présence)
 */
router.post('/:id/fichiers', async (req, res) => {
  try {
    const { id: session_id } = req.params;
    const { type, titre, file_url, file_name, file_size } = req.body;

    if (!type || !titre) {
      return res.status(400).json({
        success: false,
        error: 'type et titre sont obligatoires'
      });
    }

    if (!['test', 'presence'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'type doit être "test" ou "presence"'
      });
    }

    const fichierId = nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO session_fichiers (
        id, session_id, type, titre, file_url,
        file_name, file_size, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      fichierId, session_id, type, titre, file_url,
      file_name, file_size, now, now
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      fichier: result.rows[0],
      message: 'Fichier ajouté avec succès'
    });

  } catch (error) {
    console.error('Error adding file to session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/sessions-formation/fichiers/:fichierId
 * Supprimer un fichier
 */
router.delete('/fichiers/:fichierId', async (req, res) => {
  try {
    const { fichierId } = req.params;

    const result = await pool.query(
      'DELETE FROM session_fichiers WHERE id = $1 RETURNING *',
      [fichierId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Fichier not found'
      });
    }

    res.json({
      success: true,
      message: 'Fichier supprimé avec succès'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ROUTES DE PAIEMENTS DES ÉTUDIANTS
// ============================================

/**
 * POST /api/sessions-formation/:sessionId/etudiants/:studentId/paiements
 * Enregistrer un nouveau paiement pour un étudiant
 */
router.post('/:sessionId/etudiants/:studentId/paiements', async (req, res) => {
  try {
    const { sessionId, studentId } = req.params;
    const { amount, payment_date, payment_method, reference_number, note } = req.body;

    // Validation des données
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Le montant du paiement doit être supérieur à zéro'
      });
    }

    const validMethods = ['especes', 'virement', 'cheque', 'carte', 'autre'];
    if (!payment_method || !validMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        error: 'Méthode de paiement invalide'
      });
    }

    // Récupérer l'enregistrement session_etudiant
    const sessionEtudiantResult = await pool.query(
      'SELECT * FROM session_etudiants WHERE session_id = $1 AND student_id = $2',
      [sessionId, studentId]
    );

    if (sessionEtudiantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Étudiant non trouvé dans cette session'
      });
    }

    const sessionEtudiant = sessionEtudiantResult.rows[0];

    // Vérifier que le paiement ne dépasse pas le montant restant dû
    const montantDu = parseFloat(sessionEtudiant.montant_du || 0);
    if (parseFloat(amount) > montantDu) {
      return res.status(400).json({
        success: false,
        error: `Le montant du paiement (${amount} DH) dépasse le montant restant dû (${montantDu.toFixed(2)} DH)`
      });
    }

    // Créer le paiement
    const paymentResult = await pool.query(
      `INSERT INTO student_payments (
        session_etudiant_id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        note
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        sessionEtudiant.id,
        amount,
        payment_date || new Date().toISOString().split('T')[0],
        payment_method,
        reference_number || null,
        note || null
      ]
    );

    const payment = paymentResult.rows[0];

    // Mettre à jour montant_paye et statut_paiement dans session_etudiants
    const newMontantPaye = parseFloat(sessionEtudiant.montant_paye || 0) + parseFloat(amount);
    const newMontantDu = parseFloat(sessionEtudiant.montant_total || 0) - newMontantPaye;

    let newStatutPaiement = 'impaye';
    if (newMontantPaye >= parseFloat(sessionEtudiant.montant_total || 0)) {
      newStatutPaiement = 'paye';
    } else if (newMontantPaye > 0) {
      newStatutPaiement = 'partiellement_paye';
    }

    await pool.query(
      `UPDATE session_etudiants
       SET montant_paye = $1,
           montant_du = $2,
           statut_paiement = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newMontantPaye, newMontantDu, newStatutPaiement, sessionEtudiant.id]
    );

    res.status(201).json({
      success: true,
      payment,
      updated_totals: {
        montant_paye: newMontantPaye,
        montant_du: newMontantDu,
        statut_paiement: newStatutPaiement
      }
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions-formation/:sessionId/etudiants/:studentId/paiements
 * Récupérer l'historique des paiements d'un étudiant
 */
router.get('/:sessionId/etudiants/:studentId/paiements', async (req, res) => {
  try {
    const { sessionId, studentId } = req.params;

    // Récupérer l'enregistrement session_etudiant
    const sessionEtudiantResult = await pool.query(
      'SELECT * FROM session_etudiants WHERE session_id = $1 AND student_id = $2',
      [sessionId, studentId]
    );

    if (sessionEtudiantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Étudiant non trouvé dans cette session'
      });
    }

    const sessionEtudiant = sessionEtudiantResult.rows[0];

    // Récupérer tous les paiements
    const paymentsResult = await pool.query(
      `SELECT * FROM student_payments
       WHERE session_etudiant_id = $1
       ORDER BY payment_date DESC, created_at DESC`,
      [sessionEtudiant.id]
    );

    res.json({
      success: true,
      payments: paymentsResult.rows,
      totals: {
        montant_total: parseFloat(sessionEtudiant.montant_total || 0),
        montant_paye: parseFloat(sessionEtudiant.montant_paye || 0),
        montant_du: parseFloat(sessionEtudiant.montant_du || 0),
        statut_paiement: sessionEtudiant.statut_paiement
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/sessions-formation/:sessionId/etudiants/:studentId/paiements/:paymentId
 * Annuler/Supprimer un paiement
 */
router.delete('/:sessionId/etudiants/:studentId/paiements/:paymentId', async (req, res) => {
  try {
    const { sessionId, studentId, paymentId } = req.params;

    // Récupérer l'enregistrement session_etudiant
    const sessionEtudiantResult = await pool.query(
      'SELECT * FROM session_etudiants WHERE session_id = $1 AND student_id = $2',
      [sessionId, studentId]
    );

    if (sessionEtudiantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Étudiant non trouvé dans cette session'
      });
    }

    const sessionEtudiant = sessionEtudiantResult.rows[0];

    // Récupérer le paiement à supprimer
    const paymentResult = await pool.query(
      'SELECT * FROM student_payments WHERE id = $1 AND session_etudiant_id = $2',
      [paymentId, sessionEtudiant.id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé'
      });
    }

    const payment = paymentResult.rows[0];
    const paymentAmount = parseFloat(payment.amount);

    // Supprimer le paiement
    await pool.query('DELETE FROM student_payments WHERE id = $1', [paymentId]);

    // Mettre à jour montant_paye et statut_paiement dans session_etudiants
    const newMontantPaye = parseFloat(sessionEtudiant.montant_paye || 0) - paymentAmount;
    const newMontantDu = parseFloat(sessionEtudiant.montant_total || 0) - newMontantPaye;

    let newStatutPaiement = 'impaye';
    if (newMontantPaye >= parseFloat(sessionEtudiant.montant_total || 0)) {
      newStatutPaiement = 'paye';
    } else if (newMontantPaye > 0) {
      newStatutPaiement = 'partiellement_paye';
    }

    await pool.query(
      `UPDATE session_etudiants
       SET montant_paye = $1,
           montant_du = $2,
           statut_paiement = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newMontantPaye, newMontantDu, newStatutPaiement, sessionEtudiant.id]
    );

    res.json({
      success: true,
      message: 'Paiement annulé avec succès',
      updated_totals: {
        montant_paye: newMontantPaye,
        montant_du: newMontantDu,
        statut_paiement: newStatutPaiement
      }
    });

  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
