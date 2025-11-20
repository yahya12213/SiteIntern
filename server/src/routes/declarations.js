import express from 'express';
import pool from '../config/database.js';
import { requirePermission } from '../middleware/auth.js';

const router = express.Router();

// GET toutes les déclarations (avec infos jointes)
// Filtre automatiquement par les villes assignées à l'utilisateur connecté
// Permissions: view_all (admin), view_page (comptables), professor view (professeurs)
router.get('/', requirePermission(
  'accounting.declarations.view_all',
  'accounting.declarations.view_page',
  'accounting.professor.declarations.view_page'
), async (req, res) => {
  try {
    const { professor_id, filter_by_user, view_all } = req.query;
    const userId = req.user?.id;

    console.log('Declarations request:', { professor_id, filter_by_user, view_all, userId, hasUser: !!req.user });

    // Récupérer les city_ids de l'utilisateur connecté
    let userCityIds = [];
    let isAdmin = false;
    let userRole = '';

    if (userId && (filter_by_user === 'true' || view_all === 'true')) {
      try {
        const userProfile = await pool.query(
          'SELECT city_ids, role FROM profiles WHERE id = $1',
          [userId]
        );

        console.log('User profile result:', userProfile.rows[0]);

        if (userProfile.rows.length > 0) {
          const profile = userProfile.rows[0];
          isAdmin = profile.role === 'admin';
          userRole = profile.role || '';
          // Ensure city_ids is an array
          if (Array.isArray(profile.city_ids)) {
            userCityIds = profile.city_ids;
          } else {
            userCityIds = [];
          }
          console.log('Parsed city_ids:', userCityIds, 'isAdmin:', isAdmin, 'role:', userRole);
        }
      } catch (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Continue without filtering
      }
    }

    let query = `
      SELECT pd.*,
             p.full_name as professor_name,
             s.name as segment_name,
             c.name as city_name,
             cs.title as sheet_title
      FROM professor_declarations pd
      LEFT JOIN profiles p ON pd.professor_id = p.id
      LEFT JOIN segments s ON pd.segment_id = s.id
      LEFT JOIN cities c ON pd.city_id = c.id
      LEFT JOIN calculation_sheets cs ON pd.calculation_sheet_id = cs.id
    `;

    const params = [];
    const conditions = [];

    // Filtrer par professeur si spécifié
    if (professor_id) {
      conditions.push(`pd.professor_id = $${params.length + 1}`);
      params.push(professor_id);
    }

    // Si view_all est demandé et le rôle est "impression", retourner toutes les déclarations
    if (view_all === 'true' && (isAdmin || userRole === 'impression')) {
      // Pas de filtrage - voir toutes les déclarations
      console.log('View all mode for admin or impression role');
    }
    // Filtrer par villes de l'utilisateur (sauf admin qui voit tout)
    else if (filter_by_user === 'true' && !isAdmin && userCityIds.length > 0) {
      conditions.push(`pd.city_id = ANY($${params.length + 1}::uuid[])`);
      params.push(userCityIds);
    } else if (filter_by_user === 'true' && !isAdmin && userCityIds.length === 0) {
      // Utilisateur non-admin sans villes assignées = aucune déclaration
      return res.json([]);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY pd.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching declarations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET une déclaration par ID
// Permissions: view_page (admin/comptables), professor view (professeurs)
router.get('/:id', requirePermission(
  'accounting.declarations.view_page',
  'accounting.declarations.view_all',
  'accounting.professor.declarations.view_page'
), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT pd.*,
             p.full_name as professor_name,
             s.name as segment_name,
             c.name as city_name,
             cs.title as sheet_title,
             cs.template_data
      FROM professor_declarations pd
      LEFT JOIN profiles p ON pd.professor_id = p.id
      LEFT JOIN segments s ON pd.segment_id = s.id
      LEFT JOIN cities c ON pd.city_id = c.id
      LEFT JOIN calculation_sheets cs ON pd.calculation_sheet_id = cs.id
      WHERE pd.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Declaration not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching declaration:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST créer une déclaration
// Permissions: create (admin), fill (professeurs)
router.post('/', requirePermission(
  'accounting.declarations.create',
  'accounting.professor.declarations.fill'
), async (req, res) => {
  try {
    const { id, professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date, form_data, status } = req.body;

    // Vérifier si une déclaration identique existe déjà
    // (même professeur, segment, ville et période - peu importe le modèle de fiche)
    const duplicateCheck = await pool.query(
      `SELECT id FROM professor_declarations
       WHERE professor_id = $1
       AND segment_id = $2
       AND city_id = $3
       AND start_date = $4
       AND end_date = $5`,
      [professor_id, segment_id, city_id, start_date, end_date]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Une déclaration existe déjà pour cette période, ville et segment'
      });
    }

    // Utiliser le statut fourni, ou 'brouillon' par défaut
    const declarationStatus = status || 'brouillon';

    const result = await pool.query(
      `INSERT INTO professor_declarations (id, professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date, form_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, professor_id, calculation_sheet_id, segment_id, city_id, start_date, end_date, form_data || '{}', declarationStatus]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating declaration:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT mettre à jour une déclaration
// Permissions: update (admin), approve (pour validation), fill (professeurs)
router.put('/:id', requirePermission(
  'accounting.declarations.update',
  'accounting.declarations.approve',
  'accounting.professor.declarations.fill'
), async (req, res) => {
  try {
    const { id } = req.params;
    const { form_data, status, rejection_reason, segment_id, city_id, start_date, end_date } = req.body;

    // Construire dynamiquement la requête SQL en fonction des champs fournis
    const updates = [];
    const params = [];
    let paramCount = 1;

    // Champs de métadonnées modifiables par l'admin
    if (segment_id !== undefined) {
      updates.push(`segment_id = $${paramCount++}`);
      params.push(segment_id);
    }
    if (city_id !== undefined) {
      updates.push(`city_id = $${paramCount++}`);
      params.push(city_id);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      params.push(end_date);
    }

    // Champs standards
    if (form_data !== undefined) {
      updates.push(`form_data = $${paramCount++}`);
      params.push(form_data);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }
    if (rejection_reason !== undefined) {
      updates.push(`rejection_reason = $${paramCount++}`);
      params.push(rejection_reason || null);
    }

    // Timestamps conditionnels
    if (status === 'soumise') {
      updates.push('submitted_at = CURRENT_TIMESTAMP');
    } else if (status === 'approuvee' || status === 'refusee') {
      updates.push('reviewed_at = CURRENT_TIMESTAMP');
    }

    // Toujours mettre à jour updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 1) { // Seulement updated_at
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE professor_declarations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Declaration not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating declaration:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE supprimer une déclaration
// Permissions: delete (admin only)
router.delete('/:id', requirePermission('accounting.declarations.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM professor_declarations WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Declaration not found' });
    }

    res.json({ message: 'Declaration deleted successfully' });
  } catch (error) {
    console.error('Error deleting declaration:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
