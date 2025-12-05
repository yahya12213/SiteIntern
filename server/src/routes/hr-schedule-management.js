/**
 * HR Schedule Management API
 * Consolidates: Work Schedules, Public Holidays, Approved Leaves, Overtime Declarations
 */

import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// ============================================================
// WORK SCHEDULES (Modèles d'Horaires)
// ============================================================

/**
 * GET /api/hr/schedule-management/schedules
 * Get all work schedules
 */
router.get('/schedules', authenticateToken, requirePermission('hr.settings.view_page'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        description,
        monday_start, monday_end,
        tuesday_start, tuesday_end,
        wednesday_start, wednesday_end,
        thursday_start, thursday_end,
        friday_start, friday_end,
        saturday_start, saturday_end,
        sunday_start, sunday_end,
        weekly_hours,
        tolerance_late_minutes,
        tolerance_early_leave_minutes,
        min_hours_for_half_day,
        valid_from,
        valid_to,
        is_default,
        is_active,
        segment_id,
        created_at,
        updated_at
      FROM hr_work_schedules
      ORDER BY is_default DESC, name
    `);

    // Transform to frontend format
    const schedules = result.rows.map(row => ({
      id: row.id,
      nom: row.name,
      description: row.description,
      actif: row.is_active !== false,
      horaires: {
        'Lundi': { actif: !!row.monday_start, heureDebut: row.monday_start || '', heureFin: row.monday_end || '', pauses: [] },
        'Mardi': { actif: !!row.tuesday_start, heureDebut: row.tuesday_start || '', heureFin: row.tuesday_end || '', pauses: [] },
        'Mercredi': { actif: !!row.wednesday_start, heureDebut: row.wednesday_start || '', heureFin: row.wednesday_end || '', pauses: [] },
        'Jeudi': { actif: !!row.thursday_start, heureDebut: row.thursday_start || '', heureFin: row.thursday_end || '', pauses: [] },
        'Vendredi': { actif: !!row.friday_start, heureDebut: row.friday_start || '', heureFin: row.friday_end || '', pauses: [] },
        'Samedi': { actif: !!row.saturday_start, heureDebut: row.saturday_start || '', heureFin: row.saturday_end || '', pauses: [] },
        'Dimanche': { actif: !!row.sunday_start, heureDebut: row.sunday_start || '', heureFin: row.sunday_end || '', pauses: [] },
      },
      heures_hebdo: row.weekly_hours || 44,
      is_default: row.is_default,
      tolerance_late: row.tolerance_late_minutes,
      tolerance_early: row.tolerance_early_leave_minutes,
    }));

    res.json({ success: true, schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hr/schedule-management/schedules/:id
 * Get a single work schedule by ID
 */
router.get('/schedules/:id', authenticateToken, requirePermission('hr.settings.view_page'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        id, name, description,
        monday_start, monday_end,
        tuesday_start, tuesday_end,
        wednesday_start, wednesday_end,
        thursday_start, thursday_end,
        friday_start, friday_end,
        saturday_start, saturday_end,
        sunday_start, sunday_end,
        break_start, break_end,
        weekly_hours,
        tolerance_late_minutes,
        tolerance_early_leave_minutes,
        min_hours_for_half_day,
        is_default, is_active,
        created_at, updated_at
      FROM hr_work_schedules
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Horaire non trouvé' });
    }

    res.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hr/schedule-management/schedules
 * Create a new work schedule
 */
router.post('/schedules', authenticateToken, requirePermission('hr.settings.edit'), async (req, res) => {
  try {
    const {
      nom, description, horaires, heures_hebdo, is_default,
      tolerance_late, tolerance_early, actif,
      break_start, break_end, min_hours_for_half_day
    } = req.body;

    // If setting as default, unset others
    if (is_default) {
      await pool.query('UPDATE hr_work_schedules SET is_default = false');
    }

    const result = await pool.query(`
      INSERT INTO hr_work_schedules (
        name, description,
        monday_start, monday_end,
        tuesday_start, tuesday_end,
        wednesday_start, wednesday_end,
        thursday_start, thursday_end,
        friday_start, friday_end,
        saturday_start, saturday_end,
        sunday_start, sunday_end,
        break_start, break_end,
        weekly_hours,
        tolerance_late_minutes,
        tolerance_early_leave_minutes,
        min_hours_for_half_day,
        is_default,
        is_active,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *
    `, [
      nom,
      description,
      horaires?.Lundi?.actif ? horaires.Lundi.heureDebut : null,
      horaires?.Lundi?.actif ? horaires.Lundi.heureFin : null,
      horaires?.Mardi?.actif ? horaires.Mardi.heureDebut : null,
      horaires?.Mardi?.actif ? horaires.Mardi.heureFin : null,
      horaires?.Mercredi?.actif ? horaires.Mercredi.heureDebut : null,
      horaires?.Mercredi?.actif ? horaires.Mercredi.heureFin : null,
      horaires?.Jeudi?.actif ? horaires.Jeudi.heureDebut : null,
      horaires?.Jeudi?.actif ? horaires.Jeudi.heureFin : null,
      horaires?.Vendredi?.actif ? horaires.Vendredi.heureDebut : null,
      horaires?.Vendredi?.actif ? horaires.Vendredi.heureFin : null,
      horaires?.Samedi?.actif ? horaires.Samedi.heureDebut : null,
      horaires?.Samedi?.actif ? horaires.Samedi.heureFin : null,
      horaires?.Dimanche?.actif ? horaires.Dimanche.heureDebut : null,
      horaires?.Dimanche?.actif ? horaires.Dimanche.heureFin : null,
      break_start || null,
      break_end || null,
      heures_hebdo || 44,
      tolerance_late || 15,
      tolerance_early || 10,
      min_hours_for_half_day || 4,
      is_default || false,
      actif !== false,
      req.user.id
    ]);

    res.status(201).json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/hr/schedule-management/schedules/:id
 * Update a work schedule
 */
router.put('/schedules/:id', authenticateToken, requirePermission('hr.settings.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom, description, horaires, heures_hebdo, is_default,
      tolerance_late, tolerance_early, actif,
      break_start, break_end, min_hours_for_half_day
    } = req.body;

    // If setting as default, unset others
    if (is_default) {
      await pool.query('UPDATE hr_work_schedules SET is_default = false WHERE id != $1', [id]);
    }

    const result = await pool.query(`
      UPDATE hr_work_schedules SET
        name = $1,
        description = $2,
        monday_start = $3, monday_end = $4,
        tuesday_start = $5, tuesday_end = $6,
        wednesday_start = $7, wednesday_end = $8,
        thursday_start = $9, thursday_end = $10,
        friday_start = $11, friday_end = $12,
        saturday_start = $13, saturday_end = $14,
        sunday_start = $15, sunday_end = $16,
        break_start = $17, break_end = $18,
        weekly_hours = $19,
        tolerance_late_minutes = $20,
        tolerance_early_leave_minutes = $21,
        min_hours_for_half_day = $22,
        is_default = $23,
        is_active = $24,
        updated_at = NOW()
      WHERE id = $25
      RETURNING *
    `, [
      nom,
      description,
      horaires?.Lundi?.actif ? horaires.Lundi.heureDebut : null,
      horaires?.Lundi?.actif ? horaires.Lundi.heureFin : null,
      horaires?.Mardi?.actif ? horaires.Mardi.heureDebut : null,
      horaires?.Mardi?.actif ? horaires.Mardi.heureFin : null,
      horaires?.Mercredi?.actif ? horaires.Mercredi.heureDebut : null,
      horaires?.Mercredi?.actif ? horaires.Mercredi.heureFin : null,
      horaires?.Jeudi?.actif ? horaires.Jeudi.heureDebut : null,
      horaires?.Jeudi?.actif ? horaires.Jeudi.heureFin : null,
      horaires?.Vendredi?.actif ? horaires.Vendredi.heureDebut : null,
      horaires?.Vendredi?.actif ? horaires.Vendredi.heureFin : null,
      horaires?.Samedi?.actif ? horaires.Samedi.heureDebut : null,
      horaires?.Samedi?.actif ? horaires.Samedi.heureFin : null,
      horaires?.Dimanche?.actif ? horaires.Dimanche.heureDebut : null,
      horaires?.Dimanche?.actif ? horaires.Dimanche.heureFin : null,
      break_start || null,
      break_end || null,
      heures_hebdo || 44,
      tolerance_late || 15,
      tolerance_early || 10,
      min_hours_for_half_day || 4,
      is_default || false,
      actif !== false,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Modèle non trouvé' });
    }

    res.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/hr/schedule-management/schedules/:id
 * Delete a work schedule
 */
router.delete('/schedules/:id', authenticateToken, requirePermission('hr.settings.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if in use
    const inUse = await pool.query(
      'SELECT COUNT(*) FROM hr_employee_schedules WHERE schedule_id = $1',
      [id]
    );

    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ce modèle est assigné à des employés et ne peut pas être supprimé'
      });
    }

    const result = await pool.query(
      'DELETE FROM hr_work_schedules WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Modèle non trouvé' });
    }

    res.json({ success: true, message: 'Modèle supprimé' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PUBLIC HOLIDAYS (Jours Fériés)
// ============================================================

/**
 * GET /api/hr/schedule-management/holidays
 * Get all public holidays
 */
router.get('/holidays', authenticateToken, requirePermission('hr.settings.view_page'), async (req, res) => {
  try {
    const { year } = req.query;

    let query = `
      SELECT
        id,
        holiday_date as date_debut,
        holiday_date as date_fin,
        name as nom,
        description,
        is_recurring as recurrent,
        'ferie' as type
      FROM hr_public_holidays
    `;

    const params = [];
    if (year) {
      query += ` WHERE EXTRACT(YEAR FROM holiday_date) = $1`;
      params.push(parseInt(year));
    }

    query += ` ORDER BY holiday_date ASC`;

    const result = await pool.query(query, params);

    res.json({ success: true, holidays: result.rows });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hr/schedule-management/holidays
 * Create a public holiday
 */
router.post('/holidays', authenticateToken, requirePermission('hr.settings.edit'), async (req, res) => {
  try {
    const { nom, date_debut, date_fin, type, recurrent, description } = req.body;

    if (!nom || !date_debut) {
      return res.status(400).json({
        success: false,
        error: 'Le nom et la date sont requis'
      });
    }

    // Check if exists
    const existing = await pool.query(
      'SELECT id FROM hr_public_holidays WHERE holiday_date = $1',
      [date_debut]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Un jour férié existe déjà pour cette date'
      });
    }

    const result = await pool.query(`
      INSERT INTO hr_public_holidays (
        holiday_date, name, description, is_recurring, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING
        id,
        holiday_date as date_debut,
        holiday_date as date_fin,
        name as nom,
        description,
        is_recurring as recurrent,
        'ferie' as type
    `, [date_debut, nom, description, recurrent || false]);

    res.status(201).json({ success: true, holiday: result.rows[0] });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/hr/schedule-management/holidays/:id
 * Update a public holiday
 */
router.put('/holidays/:id', authenticateToken, requirePermission('hr.settings.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, date_debut, recurrent, description } = req.body;

    const result = await pool.query(`
      UPDATE hr_public_holidays SET
        holiday_date = COALESCE($1, holiday_date),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        is_recurring = COALESCE($4, is_recurring),
        updated_at = NOW()
      WHERE id = $5
      RETURNING
        id,
        holiday_date as date_debut,
        holiday_date as date_fin,
        name as nom,
        description,
        is_recurring as recurrent,
        'ferie' as type
    `, [date_debut, nom, description, recurrent, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Jour férié non trouvé' });
    }

    res.json({ success: true, holiday: result.rows[0] });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/hr/schedule-management/holidays/:id
 * Delete a public holiday
 */
router.delete('/holidays/:id', authenticateToken, requirePermission('hr.settings.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM hr_public_holidays WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Jour férié non trouvé' });
    }

    res.json({ success: true, message: 'Jour férié supprimé' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// APPROVED LEAVES (Congés Validés)
// ============================================================

/**
 * GET /api/hr/schedule-management/approved-leaves
 * Get all approved leave requests
 */
router.get('/approved-leaves', authenticateToken, requirePermission('hr.leaves.view_page'), async (req, res) => {
  try {
    const { year, month } = req.query;

    let query = `
      SELECT
        lr.id,
        e.first_name || ' ' || e.last_name as employe_nom,
        lt.name as type_conge,
        lt.code as type_code,
        lr.start_date as date_debut,
        lr.end_date as date_fin,
        lr.days_requested as jours,
        lr.status as statut,
        lr.description,
        lr.approved_by_n1_at,
        lr.approved_by_n2_at,
        lr.approved_by_hr_at
      FROM hr_leave_requests lr
      JOIN hr_employees e ON e.id = lr.employee_id
      LEFT JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.status = 'approved'
    `;

    const params = [];
    let paramCount = 1;

    if (year) {
      query += ` AND EXTRACT(YEAR FROM lr.start_date) = $${paramCount}`;
      params.push(parseInt(year));
      paramCount++;
    }

    if (month) {
      query += ` AND EXTRACT(MONTH FROM lr.start_date) = $${paramCount}`;
      params.push(parseInt(month));
      paramCount++;
    }

    query += ` ORDER BY lr.start_date DESC`;

    const result = await pool.query(query, params);

    res.json({ success: true, leaves: result.rows });
  } catch (error) {
    console.error('Error fetching approved leaves:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// OVERTIME DECLARATIONS (Heures Supplémentaires)
// ============================================================

/**
 * GET /api/hr/schedule-management/overtime
 * Get all overtime declarations
 */
router.get('/overtime', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  try {
    const { status, year, month } = req.query;

    let query = `
      SELECT
        o.id,
        e.first_name || ' ' || e.last_name as employe_nom,
        e.employee_number,
        o.request_date,
        o.start_time,
        o.end_time,
        o.hours_requested as heures_demandees,
        o.hours_approved as heures_approuvees,
        o.reason as motif,
        o.status as statut,
        o.is_prior_approved,
        o.approved_by_n1_at,
        o.approved_by_n2_at,
        o.n1_comment,
        o.n2_comment,
        TO_CHAR(o.request_date, 'Month YYYY') as periode
      FROM hr_overtime_requests o
      JOIN hr_employees e ON e.id = o.employee_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (year) {
      query += ` AND EXTRACT(YEAR FROM o.request_date) = $${paramCount}`;
      params.push(parseInt(year));
      paramCount++;
    }

    if (month) {
      query += ` AND EXTRACT(MONTH FROM o.request_date) = $${paramCount}`;
      params.push(parseInt(month));
      paramCount++;
    }

    query += ` ORDER BY o.request_date DESC, o.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ success: true, overtime: result.rows });
  } catch (error) {
    console.error('Error fetching overtime:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hr/schedule-management/overtime
 * Create an overtime declaration (admin/manager)
 */
router.post('/overtime', authenticateToken, requirePermission('hr.attendance.create'), async (req, res) => {
  try {
    const {
      employee_id,
      request_date,
      start_time,
      end_time,
      hours_requested,
      reason,
      is_prior_approved
    } = req.body;

    if (!employee_id || !request_date || !hours_requested) {
      return res.status(400).json({
        success: false,
        error: 'Employé, date et heures demandées sont requis'
      });
    }

    const result = await pool.query(`
      INSERT INTO hr_overtime_requests (
        employee_id,
        request_date,
        start_time,
        end_time,
        hours_requested,
        reason,
        is_prior_approved,
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      RETURNING *
    `, [
      employee_id,
      request_date,
      start_time,
      end_time,
      hours_requested,
      reason,
      is_prior_approved || false,
      req.user.id
    ]);

    res.status(201).json({ success: true, overtime: result.rows[0] });
  } catch (error) {
    console.error('Error creating overtime:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/hr/schedule-management/overtime/:id/approve
 * Approve an overtime declaration
 */
router.put('/overtime/:id/approve', authenticateToken, requirePermission('hr.leaves.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { hours_approved, comment } = req.body;

    const result = await pool.query(`
      UPDATE hr_overtime_requests SET
        status = 'approved',
        hours_approved = $1,
        approved_by_n1 = $2,
        approved_by_n1_at = NOW(),
        n1_comment = $3,
        updated_at = NOW()
      WHERE id = $4 AND status = 'pending'
      RETURNING *
    `, [hours_approved, req.user.id, comment, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Déclaration non trouvée ou déjà traitée'
      });
    }

    res.json({ success: true, overtime: result.rows[0] });
  } catch (error) {
    console.error('Error approving overtime:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/hr/schedule-management/overtime/:id/reject
 * Reject an overtime declaration
 */
router.put('/overtime/:id/reject', authenticateToken, requirePermission('hr.leaves.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const result = await pool.query(`
      UPDATE hr_overtime_requests SET
        status = 'rejected',
        approved_by_n1 = $1,
        approved_by_n1_at = NOW(),
        n1_comment = $2,
        updated_at = NOW()
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `, [req.user.id, comment, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Déclaration non trouvée ou déjà traitée'
      });
    }

    res.json({ success: true, overtime: result.rows[0] });
  } catch (error) {
    console.error('Error rejecting overtime:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/hr/schedule-management/overtime/:id
 * Delete an overtime declaration (only if pending)
 */
router.delete('/overtime/:id', authenticateToken, requirePermission('hr.attendance.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM hr_overtime_requests WHERE id = $1 AND status = $2 RETURNING id',
      [id, 'pending']
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Seules les déclarations en attente peuvent être supprimées'
      });
    }

    res.json({ success: true, message: 'Déclaration supprimée' });
  } catch (error) {
    console.error('Error deleting overtime:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// STATS & SUMMARY
// ============================================================

/**
 * GET /api/hr/schedule-management/stats
 * Get schedule management statistics
 */
router.get('/stats', authenticateToken, requirePermission('hr.dashboard.view_page'), async (req, res) => {
  try {
    const [schedules, holidays, leaves, overtime] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM hr_work_schedules WHERE is_active = true'),
      pool.query(`SELECT COUNT(*) as count FROM hr_public_holidays WHERE EXTRACT(YEAR FROM holiday_date) = $1`, [new Date().getFullYear()]),
      pool.query(`SELECT COUNT(*) as count FROM hr_leave_requests WHERE status = 'approved' AND EXTRACT(YEAR FROM start_date) = $1`, [new Date().getFullYear()]),
      pool.query(`SELECT COUNT(*) as count FROM hr_overtime_requests WHERE status = 'pending'`)
    ]);

    res.json({
      success: true,
      stats: {
        active_schedules: parseInt(schedules.rows[0].count),
        holidays_this_year: parseInt(holidays.rows[0].count),
        approved_leaves: parseInt(leaves.rows[0].count),
        pending_overtime: parseInt(overtime.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
