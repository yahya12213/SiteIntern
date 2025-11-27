/**
 * Routes Prospects - Gestion complète des prospects
 * Normalisation internationale, affectation automatique, qualification, nettoyage
 */

import express from 'express';
import pool from '../config/database.js';
import { requirePermission } from '../middleware/auth.js';
import { injectUserScope, buildScopeFilter, requireRecordScope } from '../middleware/requireScope.js';
import { normalizePhoneInternational } from '../utils/phone-validator.js';
import { autoAssignProspect, reassignIfOutOfScope } from '../utils/prospect-assignment.js';
import { handleDuplicateOrReinject, reinjectProspect } from '../utils/prospect-reinject.js';
import { runCleaningBatch, deleteMarkedProspects, getProspectsToDelete, getCleaningStats } from '../utils/prospect-cleaner.js';

const router = express.Router();

// ============================================================
// GET /api/prospects - Liste des prospects avec filtres
// ============================================================
router.get('/',
  requirePermission('commercialisation.prospects.view_page'),
  injectUserScope,
  async (req, res) => {
    try {
      const {
        segment_id,
        ville_id,
        statut_contact,
        assigned_to,
        decision_nettoyage,
        country_code,
        search,
        page = 1,
        limit = 50
      } = req.query;

      let query = `
        SELECT
          p.*,
          s.name as segment_name,
          c.name as ville_name,
          prof.full_name as assigned_to_name
        FROM prospects p
        LEFT JOIN segments s ON s.id = p.segment_id
        LEFT JOIN cities c ON c.id = p.ville_id
        LEFT JOIN profiles prof ON prof.id = p.assigned_to
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      // SCOPE FILTERING: Filtre automatique par segment ET ville (sauf admin)
      const scopeFilter = buildScopeFilter(req, 'p.segment_id', 'p.ville_id');
      if (scopeFilter.hasScope) {
        const adjustedScopeConditions = scopeFilter.conditions.map(condition => {
          return condition.replace(/\$(\d+)/g, (match, num) => {
            return `$${params.length + parseInt(num)}`;
          });
        });
        query += ` AND (${adjustedScopeConditions.join(' AND ')})`;
        params.push(...scopeFilter.params);
        paramIndex += scopeFilter.params.length;
      }

      // Filtres additionnels
      if (segment_id) {
        query += ` AND p.segment_id = $${paramIndex++}`;
        params.push(segment_id);
      }
      if (ville_id) {
        query += ` AND p.ville_id = $${paramIndex++}`;
        params.push(ville_id);
      }
      if (statut_contact) {
        query += ` AND p.statut_contact = $${paramIndex++}`;
        params.push(statut_contact);
      }
      if (assigned_to) {
        query += ` AND p.assigned_to = $${paramIndex++}`;
        params.push(assigned_to);
      }
      if (decision_nettoyage) {
        query += ` AND p.decision_nettoyage = $${paramIndex++}`;
        params.push(decision_nettoyage);
      }
      if (country_code) {
        query += ` AND p.country_code = $${paramIndex++}`;
        params.push(country_code);
      }
      if (search) {
        query += ` AND (p.phone_international LIKE $${paramIndex} OR p.nom ILIKE $${paramIndex} OR p.prenom ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Tri par date_injection DESC (réinjections en premier)
      query += ` ORDER BY p.date_injection DESC`;

      // Pagination
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const { rows } = await pool.query(query, params);

      // Stats
      let statsQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE statut_contact IN ('non contacté', 'nouveau')) as non_contactes,
          COUNT(*) FILTER (WHERE statut_contact = 'contacté avec rdv') as avec_rdv,
          COUNT(*) FILTER (WHERE statut_contact = 'contacté sans rdv') as sans_rdv,
          COUNT(*) FILTER (WHERE statut_contact = 'inscrit') as inscrits,
          COUNT(*) FILTER (WHERE decision_nettoyage = 'supprimer') as a_supprimer
        FROM prospects p
        WHERE 1=1
      `;

      if (scopeFilter.hasScope) {
        const adjustedScopeConditions = scopeFilter.conditions.map(condition => {
          return condition.replace(/\$(\d+)/g, (match, num) => {
            return `$${parseInt(num)}`;
          });
        });
        statsQuery += ` AND (${adjustedScopeConditions.join(' AND ')})`;
      }

      const statsResult = await pool.query(statsQuery, scopeFilter.params);

      res.json({
        prospects: rows,
        stats: statsResult.rows[0],
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: parseInt(statsResult.rows[0].total, 10)
        }
      });
    } catch (error) {
      console.error('Error fetching prospects:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// POST /api/prospects - Créer un prospect (avec normalisation + affectation)
// ============================================================
router.post('/',
  requirePermission('commercialisation.prospects.create'),
  injectUserScope,
  async (req, res) => {
    try {
      const { phone: rawPhone, nom, prenom, cin, segment_id, ville_id } = req.body;

      // Validation segment
      if (!segment_id) {
        return res.status(400).json({ error: 'Veuillez sélectionner un segment' });
      }

      // Validation ville
      if (!ville_id) {
        return res.status(400).json({ error: 'Veuillez sélectionner une ville' });
      }

      // Normalisation internationale du numéro
      const phoneValidation = await normalizePhoneInternational(rawPhone);

      if (!phoneValidation.valid) {
        return res.status(400).json({ error: phoneValidation.error });
      }

      const { phone_international, country_code, country } = phoneValidation;

      // Gérer les doublons / réinjection
      const duplicateCheck = await handleDuplicateOrReinject(
        phone_international,
        req.user.id,
        { segment_id, ville_id, nom, prenom }
      );

      if (duplicateCheck.action === 'reinjected') {
        return res.status(200).json({
          message: duplicateCheck.message,
          prospect: duplicateCheck.prospect,
          reinjected: true
        });
      }

      if (duplicateCheck.action === 'duplicate') {
        return res.status(409).json({
          error: duplicateCheck.message,
          prospect: duplicateCheck.prospect
        });
      }

      // Affectation automatique si ville = "Sans Ville"
      let assigned_to = null;
      let finalVilleId = ville_id;
      let assignmentInfo = null;

      if (ville_id === 'city-sans-ville') {
        try {
          const assignment = await autoAssignProspect();
          assigned_to = assignment.assigned_to;
          finalVilleId = assignment.ville_id;
          assignmentInfo = {
            assistante_name: assignment.assistante_name,
            ville_name: assignment.ville_name
          };
        } catch (error) {
          return res.status(500).json({ error: error.message });
        }
      }

      // Validation SBAC
      if (!req.userScope.isAdmin) {
        const hasSegment = req.userScope.segmentIds.includes(segment_id);
        const hasCity = req.userScope.cityIds.includes(finalVilleId);

        if (!hasSegment || !hasCity) {
          return res.status(403).json({
            error: 'Vous ne pouvez pas créer un prospect en dehors de votre scope'
          });
        }
      }

      // Créer le prospect
      const prospectId = `prospect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const insertQuery = `
        INSERT INTO prospects (
          id, phone_raw, phone_international, country_code, country, statut_validation_numero,
          nom, prenom, cin, segment_id, ville_id, assigned_to,
          statut_contact, date_injection, is_auto_assigned, created_by
        )
        VALUES ($1, $2, $3, $4, $5, 'valide', $6, $7, $8, $9, $10, $11, 'nouveau', NOW(), $12, $13)
        RETURNING *
      `;

      const { rows } = await pool.query(insertQuery, [
        prospectId,
        rawPhone,
        phone_international,
        country_code,
        country,
        nom || null,
        prenom || null,
        cin || null,
        segment_id,
        finalVilleId,
        assigned_to,
        !!assigned_to,
        req.user.id
      ]);

      res.status(201).json({
        message: 'Prospect créé avec succès',
        prospect: rows[0],
        assignment: assignmentInfo
      });
    } catch (error) {
      console.error('Error creating prospect:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// GET /api/prospects/:id - Détails d'un prospect
// ============================================================
router.get('/:id',
  requirePermission('commercialisation.prospects.view_page'),
  injectUserScope,
  requireRecordScope('prospects', 'id', 'segment_id', 'ville_id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        SELECT
          p.*,
          s.name as segment_name,
          c.name as ville_name,
          prof.full_name as assigned_to_name
        FROM prospects p
        LEFT JOIN segments s ON s.id = p.segment_id
        LEFT JOIN cities c ON c.id = p.ville_id
        LEFT JOIN profiles prof ON prof.id = p.assigned_to
        WHERE p.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Prospect non trouvé' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching prospect:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// PUT /api/prospects/:id - Mettre à jour un prospect
// ============================================================
router.put('/:id',
  requirePermission('commercialisation.prospects.update'),
  injectUserScope,
  requireRecordScope('prospects', 'id', 'segment_id', 'ville_id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nom, prenom, cin, statut_contact, date_rdv, rdv_centre_ville_id, commentaire } = req.body;

      const updateQuery = `
        UPDATE prospects
        SET
          nom = COALESCE($1, nom),
          prenom = COALESCE($2, prenom),
          cin = COALESCE($3, cin),
          statut_contact = COALESCE($4, statut_contact),
          date_rdv = $5,
          rdv_centre_ville_id = $6,
          commentaire = COALESCE($7, commentaire),
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `;

      const { rows } = await pool.query(updateQuery, [
        nom,
        prenom,
        cin,
        statut_contact,
        date_rdv || null,
        rdv_centre_ville_id || null,
        commentaire,
        id
      ]);

      res.json({
        message: 'Prospect mis à jour',
        prospect: rows[0]
      });
    } catch (error) {
      console.error('Error updating prospect:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// DELETE /api/prospects/:id - Supprimer un prospect
// ============================================================
router.delete('/:id',
  requirePermission('commercialisation.prospects.delete'),
  injectUserScope,
  requireRecordScope('prospects', 'id', 'segment_id', 'ville_id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      await pool.query('DELETE FROM prospects WHERE id = $1', [id]);

      res.json({ message: 'Prospect supprimé' });
    } catch (error) {
      console.error('Error deleting prospect:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// POST /api/prospects/import - Import en masse
// ============================================================
router.post('/import',
  requirePermission('commercialisation.prospects.import'),
  injectUserScope,
  async (req, res) => {
    try {
      const { segment_id, lines } = req.body;

      if (!segment_id) {
        return res.status(400).json({ error: 'Veuillez sélectionner un segment' });
      }

      // Récupérer les villes du segment
      const { rows: villes } = await pool.query(
        'SELECT id, name FROM cities WHERE segment_id = $1',
        [segment_id]
      );
      const villesMap = new Map(villes.map(v => [v.name.toLowerCase(), v.id]));

      const results = [];
      let created = 0;
      let reinjected = 0;
      let errors = 0;

      for (const line of lines) {
        const result = { original: line, status: null, error: null };

        // Validation téléphone internationale
        const phoneValidation = await normalizePhoneInternational(line.phone);

        if (!phoneValidation.valid) {
          result.status = 'error';
          result.error = phoneValidation.error;
          errors++;
          results.push(result);
          continue;
        }

        // Validation ville
        const villeName = line.ville?.toLowerCase();
        const villeId = villesMap.get(villeName);

        if (!villeId) {
          result.status = 'error';
          result.error = 'Ville non existante dans le segment';
          errors++;
          results.push(result);
          continue;
        }

        // Gérer doublon / réinjection
        const duplicateCheck = await handleDuplicateOrReinject(
          phoneValidation.phone_international,
          req.user.id,
          { segment_id, ville_id: villeId }
        );

        if (duplicateCheck.action === 'reinjected') {
          result.status = 'reinjected';
          reinjected++;
          results.push(result);
          continue;
        }

        if (duplicateCheck.action === 'duplicate') {
          result.status = 'duplicate';
          result.error = 'Numéro déjà existant';
          errors++;
          results.push(result);
          continue;
        }

        // Créer le prospect
        const prospectId = `prospect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await pool.query(`
          INSERT INTO prospects (
            id, phone_raw, phone_international, country_code, country, statut_validation_numero,
            segment_id, ville_id, statut_contact, date_injection, created_by
          )
          VALUES ($1, $2, $3, $4, $5, 'valide', $6, $7, 'nouveau', NOW(), $8)
        `, [
          prospectId,
          line.phone,
          phoneValidation.phone_international,
          phoneValidation.country_code,
          phoneValidation.country,
          segment_id,
          villeId,
          req.user.id
        ]);

        result.status = 'created';
        created++;
        results.push(result);
      }

      res.json({
        message: `Import terminé : ${created} créés, ${reinjected} réinjectés, ${errors} erreurs`,
        summary: { created, reinjected, errors },
        details: results
      });
    } catch (error) {
      console.error('Error importing prospects:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// POST /api/prospects/:id/start-call - Démarrer un appel
// ============================================================
router.post('/:id/start-call',
  requirePermission('commercialisation.prospects.call'),
  injectUserScope,
  requireRecordScope('prospects', 'id', 'segment_id', 'ville_id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Récupérer le statut actuel
      const { rows: prospects } = await pool.query(
        'SELECT statut_contact FROM prospects WHERE id = $1',
        [id]
      );

      const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await pool.query(`
        INSERT INTO prospect_call_history (
          id, prospect_id, user_id, call_start, status_before
        )
        VALUES ($1, $2, $3, NOW(), $4)
      `, [callId, id, req.user.id, prospects[0].statut_contact]);

      res.json({ call_id: callId, started_at: new Date() });
    } catch (error) {
      console.error('Error starting call:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// POST /api/prospects/:id/end-call - Terminer un appel
// ============================================================
router.post('/:id/end-call',
  requirePermission('commercialisation.prospects.call'),
  injectUserScope,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        call_id,
        statut_contact,
        commentaire,
        ville_id,
        date_rdv,
        rdv_centre_ville_id,
        nom,
        prenom,
        cin
      } = req.body;

      // Calculer la durée
      const { rows: calls } = await pool.query(
        'SELECT call_start FROM prospect_call_history WHERE id = $1',
        [call_id]
      );

      const duration = Math.floor((Date.now() - new Date(calls[0].call_start).getTime()) / 1000);

      // Mettre à jour l'historique
      await pool.query(`
        UPDATE prospect_call_history
        SET call_end = NOW(), duration_seconds = $1, status_after = $2, commentaire = $3
        WHERE id = $4
      `, [duration, statut_contact, commentaire, call_id]);

      // Récupérer le prospect actuel
      const { rows: currentProspect } = await pool.query(
        'SELECT * FROM prospects WHERE id = $1',
        [id]
      );

      const prospect = currentProspect[0];

      // Mettre à jour le prospect
      await pool.query(`
        UPDATE prospects
        SET
          nom = COALESCE($1, nom),
          prenom = COALESCE($2, prenom),
          cin = COALESCE($3, cin),
          statut_contact = $4,
          ville_id = $5,
          date_rdv = $6,
          rdv_centre_ville_id = $7,
          commentaire = COALESCE($8, commentaire),
          updated_at = NOW()
        WHERE id = $9
      `, [nom, prenom, cin, statut_contact, ville_id, date_rdv, rdv_centre_ville_id, commentaire, id]);

      // Vérifier si réaffectation nécessaire (si ville changée)
      let reassignment = null;
      if (ville_id && ville_id !== prospect.ville_id && prospect.assigned_to) {
        reassignment = await reassignIfOutOfScope(id, ville_id, prospect.assigned_to);
      }

      res.json({
        message: 'Appel terminé',
        duration_seconds: duration,
        reassignment
      });
    } catch (error) {
      console.error('Error ending call:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// POST /api/prospects/:id/reinject - Réinjecter un prospect
// ============================================================
router.post('/:id/reinject',
  requirePermission('commercialisation.prospects.reinject'),
  injectUserScope,
  async (req, res) => {
    try {
      const { id } = req.params;

      const reinjected = await reinjectProspect(id, req.user.id);

      res.json({
        message: 'Prospect réinjecté avec succès',
        prospect: reinjected
      });
    } catch (error) {
      console.error('Error reinjecting prospect:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// POST /api/prospects/batch-clean - Nettoyage batch (analyse uniquement)
// ⚠️ La suppression automatique est DÉSACTIVÉE
// ============================================================
router.post('/batch-clean',
  requirePermission('commercialisation.prospects.clean'),
  async (req, res) => {
    try {
      // Note: execute_deletion est ignoré - la suppression est désactivée
      // Les prospects ne sont JAMAIS supprimés automatiquement
      // Utiliser la réinjection pour retravailler les anciens prospects

      // Recalculer les décisions (analyse uniquement)
      const cleanStats = await runCleaningBatch();

      res.json({
        message: 'Analyse terminée (suppression désactivée)',
        clean_stats: cleanStats,
        delete_stats: { deleted: 0, message: 'Suppression automatique désactivée' },
        info: 'Les prospects ne sont jamais supprimés automatiquement. Utilisez la réinjection.'
      });
    } catch (error) {
      console.error('Error batch cleaning:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// GET /api/prospects/cleaning/stats - Stats de nettoyage
// ============================================================
router.get('/cleaning/stats',
  requirePermission('commercialisation.prospects.clean'),
  async (req, res) => {
    try {
      const stats = await getCleaningStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching cleaning stats:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// GET /api/prospects/cleaning/to-delete - Prospects à supprimer
// ============================================================
router.get('/cleaning/to-delete',
  requirePermission('commercialisation.prospects.clean'),
  async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const prospects = await getProspectsToDelete(parseInt(limit, 10), parseInt(offset, 10));
      res.json(prospects);
    } catch (error) {
      console.error('Error fetching prospects to delete:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================
// GET /api/country-codes - Liste des pays supportés
// ============================================================
router.get('/country-codes',
  async (req, res) => {
    try {
      const query = `
        SELECT country_code, country, expected_national_length, region
        FROM country_phone_config
        ORDER BY region, country
      `;

      const { rows } = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching country codes:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
