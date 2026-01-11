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
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
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
      heures_hebdo ?? 44,
      tolerance_late ?? 15,
      tolerance_early ?? 10,
      min_hours_for_half_day ?? 4,
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
      heures_hebdo ?? 44,
      tolerance_late ?? 15,
      tolerance_early ?? 10,
      min_hours_for_half_day ?? 4,
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
        lr.reason as description,
        lr.n1_action_at,
        lr.n2_action_at,
        lr.hr_action_at
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
        o.estimated_hours as heures_demandees,
        o.reason as motif,
        o.status as statut,
        o.n1_approved_at,
        o.n2_approved_at,
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
        estimated_hours,
        reason,
        status,
        requested_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      RETURNING *
    `, [
      employee_id,
      request_date,
      start_time,
      end_time,
      hours_requested,
      reason,
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
        n1_approver_id = $1,
        n1_approved_at = NOW(),
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
        n1_approver_id = $1,
        n1_approved_at = NOW(),
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
// OVERTIME PERIODS (Manager declarations)
// ============================================================

/**
 * GET /api/hr/schedule-management/overtime-periods
 * List all overtime periods declared by managers
 */
router.get('/overtime-periods', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  try {
    const { year, month, status } = req.query;

    let query = `
      SELECT
        op.*,
        (SELECT COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
         FROM hr_employees e WHERE e.profile_id::text = op.declared_by::text LIMIT 1) as declared_by_name,
        COALESCE((SELECT COUNT(*)::integer FROM hr_overtime_records otr WHERE otr.period_id = op.id), 0) as employee_count,
        COALESCE((SELECT SUM(otr2.actual_minutes) FROM hr_overtime_records otr2 WHERE otr2.period_id = op.id), 0) as total_minutes
      FROM hr_overtime_periods op
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (year) {
      query += ` AND EXTRACT(YEAR FROM op.period_date)::integer = $${paramIndex++}::integer`;
      params.push(parseInt(year, 10));
    }
    if (month) {
      query += ` AND EXTRACT(MONTH FROM op.period_date)::integer = $${paramIndex++}::integer`;
      params.push(parseInt(month, 10));
    }
    if (status) {
      query += ` AND op.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY op.period_date DESC, op.start_time DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, periods: result.rows });
  } catch (error) {
    console.error('Error fetching overtime periods:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hr/schedule-management/overtime-periods
 * Create a new overtime period declaration
 */
router.post('/overtime-periods', authenticateToken, requirePermission('hr.attendance.create'), async (req, res) => {
  try {
    const { period_date, start_time, end_time, department_id, reason, rate_type } = req.body;

    if (!period_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'Date, heure de debut et heure de fin sont obligatoires'
      });
    }

    // Create the overtime period
    const result = await pool.query(`
      INSERT INTO hr_overtime_periods
        (declared_by, period_date, start_time, end_time, department_id, reason, rate_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, period_date, start_time, end_time, department_id || null, reason || null, rate_type || 'normal']);

    const period = result.rows[0];

    // Automatically calculate overtime for employees who clocked during this period
    await calculateOvertimeForPeriod(period.id);

    // Fetch updated period with counts
    const updatedPeriod = await pool.query(`
      SELECT
        op.*,
        (SELECT COUNT(*) FROM hr_overtime_records WHERE period_id = op.id) as employee_count,
        (SELECT COALESCE(SUM(actual_minutes), 0) FROM hr_overtime_records WHERE period_id = op.id) as total_minutes
      FROM hr_overtime_periods op
      WHERE op.id = $1
    `, [period.id]);

    res.status(201).json({
      success: true,
      period: updatedPeriod.rows[0],
      message: 'Periode d heures supplementaires creee avec succes'
    });
  } catch (error) {
    console.error('Error creating overtime period:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/hr/schedule-management/overtime-periods/:id
 * Cancel an overtime period
 */
router.delete('/overtime-periods/:id', authenticateToken, requirePermission('hr.attendance.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    // Mark as cancelled instead of deleting
    await pool.query(`
      UPDATE hr_overtime_periods
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // Also mark related overtime records as not validated for payroll
    await pool.query(`
      UPDATE hr_overtime_records
      SET validated_for_payroll = false
      WHERE period_id = $1
    `, [id]);

    res.json({ success: true, message: 'Periode annulee' });
  } catch (error) {
    console.error('Error cancelling overtime period:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hr/schedule-management/overtime-periods/:id/recalculate
 * Recalculate overtime for a specific period
 */
router.post('/overtime-periods/:id/recalculate', authenticateToken, requirePermission('hr.attendance.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    // Delete existing overtime records for this period
    await pool.query(`DELETE FROM hr_overtime_records WHERE period_id = $1`, [id]);

    // Recalculate
    const count = await calculateOvertimeForPeriod(id);

    res.json({
      success: true,
      message: `Heures supplementaires recalculees pour ${count} employes`
    });
  } catch (error) {
    console.error('Error recalculating overtime:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hr/schedule-management/overtime-periods/:id/employees
 * Get employees with overtime for a specific period
 */
router.get('/overtime-periods/:id/employees', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        otr.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number
      FROM hr_overtime_records otr
      JOIN hr_employees e ON otr.employee_id = e.id
      WHERE otr.period_id = $1
      ORDER BY e.last_name, e.first_name
    `, [id]);

    res.json({ success: true, employees: result.rows });
  } catch (error) {
    console.error('Error fetching period employees:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hr/schedule-management/overtime-config
 * Get overtime configuration
 */
router.get('/overtime-config', authenticateToken, requirePermission('hr.settings.view_page'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM hr_overtime_config LIMIT 1`);

    if (result.rows.length === 0) {
      // Return defaults if no config exists
      return res.json({
        success: true,
        config: {
          daily_threshold_hours: 8,
          weekly_threshold_hours: 44,
          monthly_max_hours: 40,
          rate_25_multiplier: 1.25,
          rate_50_multiplier: 1.50,
          rate_100_multiplier: 2.00,
          rate_25_threshold_hours: 8,
          rate_50_threshold_hours: 16,
          night_start: '21:00',
          night_end: '06:00',
          apply_100_for_night: true,
          apply_100_for_weekend: true,
          apply_100_for_holiday: true,
          requires_prior_approval: false
        }
      });
    }

    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Error fetching overtime config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/hr/schedule-management/overtime-config
 * Update overtime configuration
 */
router.put('/overtime-config', authenticateToken, requirePermission('hr.settings.edit'), async (req, res) => {
  try {
    const {
      daily_threshold_hours,
      weekly_threshold_hours,
      monthly_max_hours,
      rate_25_multiplier,
      rate_50_multiplier,
      rate_100_multiplier,
      rate_25_threshold_hours,
      rate_50_threshold_hours,
      night_start,
      night_end,
      apply_100_for_night,
      apply_100_for_weekend,
      apply_100_for_holiday,
      requires_prior_approval
    } = req.body;

    // Check if config exists
    const existing = await pool.query(`SELECT id FROM hr_overtime_config LIMIT 1`);

    let result;
    if (existing.rows.length === 0) {
      // Insert new config
      result = await pool.query(`
        INSERT INTO hr_overtime_config (
          daily_threshold_hours, weekly_threshold_hours, monthly_max_hours,
          rate_25_multiplier, rate_50_multiplier, rate_100_multiplier,
          rate_25_threshold_hours, rate_50_threshold_hours,
          night_start, night_end,
          apply_100_for_night, apply_100_for_weekend, apply_100_for_holiday,
          requires_prior_approval
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        daily_threshold_hours ?? 8, weekly_threshold_hours ?? 44, monthly_max_hours ?? 40,
        rate_25_multiplier ?? 1.25, rate_50_multiplier ?? 1.50, rate_100_multiplier ?? 2.00,
        rate_25_threshold_hours ?? 8, rate_50_threshold_hours ?? 16,
        night_start ?? '21:00', night_end ?? '06:00',
        apply_100_for_night ?? true, apply_100_for_weekend ?? true, apply_100_for_holiday ?? true,
        requires_prior_approval ?? false
      ]);
    } else {
      // Update existing config
      result = await pool.query(`
        UPDATE hr_overtime_config SET
          daily_threshold_hours = COALESCE($1, daily_threshold_hours),
          weekly_threshold_hours = COALESCE($2, weekly_threshold_hours),
          monthly_max_hours = COALESCE($3, monthly_max_hours),
          rate_25_multiplier = COALESCE($4, rate_25_multiplier),
          rate_50_multiplier = COALESCE($5, rate_50_multiplier),
          rate_100_multiplier = COALESCE($6, rate_100_multiplier),
          rate_25_threshold_hours = COALESCE($7, rate_25_threshold_hours),
          rate_50_threshold_hours = COALESCE($8, rate_50_threshold_hours),
          night_start = COALESCE($9, night_start),
          night_end = COALESCE($10, night_end),
          apply_100_for_night = COALESCE($11, apply_100_for_night),
          apply_100_for_weekend = COALESCE($12, apply_100_for_weekend),
          apply_100_for_holiday = COALESCE($13, apply_100_for_holiday),
          requires_prior_approval = COALESCE($14, requires_prior_approval),
          updated_at = NOW()
        WHERE id = $15
        RETURNING *
      `, [
        daily_threshold_hours, weekly_threshold_hours, monthly_max_hours,
        rate_25_multiplier, rate_50_multiplier, rate_100_multiplier,
        rate_25_threshold_hours, rate_50_threshold_hours,
        night_start, night_end,
        apply_100_for_night, apply_100_for_weekend, apply_100_for_holiday,
        requires_prior_approval,
        existing.rows[0].id
      ]);
    }

    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Error updating overtime config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Helper function to calculate overtime for a period
 */
async function calculateOvertimeForPeriod(periodId) {
  // Get the period details
  const periodResult = await pool.query(`
    SELECT * FROM hr_overtime_periods WHERE id = $1
  `, [periodId]);

  if (periodResult.rows.length === 0) {
    throw new Error('Period not found');
  }

  const period = periodResult.rows[0];

  // Convert times to minutes for easier comparison
  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const periodStartMin = toMinutes(period.start_time);
  const periodEndMin = toMinutes(period.end_time);

  // Find all employees who clocked during this period
  // We need to handle the case where clocking spans the period
  const employeesQuery = await pool.query(`
    WITH daily_records AS (
      SELECT
        ar.employee_id,
        DATE(ar.clock_time) as record_date,
        MIN(CASE WHEN ar.status = 'check_in' THEN ar.clock_time END) as check_in,
        MAX(CASE WHEN ar.status = 'check_out' THEN ar.clock_time END) as check_out
      FROM hr_attendance_records ar
      WHERE DATE(ar.clock_time) = $1
      GROUP BY ar.employee_id, DATE(ar.clock_time)
    )
    SELECT
      dr.employee_id,
      dr.check_in,
      dr.check_out,
      e.first_name || ' ' || e.last_name as employee_name
    FROM daily_records dr
    JOIN hr_employees e ON dr.employee_id = e.id
    WHERE dr.check_in IS NOT NULL
      AND dr.check_out IS NOT NULL
      AND (
        -- Employee clocked in during the HS period
        EXTRACT(HOUR FROM dr.check_in) * 60 + EXTRACT(MINUTE FROM dr.check_in) < $3
        AND EXTRACT(HOUR FROM dr.check_out) * 60 + EXTRACT(MINUTE FROM dr.check_out) > $2
      )
  `, [period.period_date, periodStartMin, periodEndMin]);

  let count = 0;

  for (const emp of employeesQuery.rows) {
    // Calculate overlap between employee work time and declared period
    const empCheckInMin = emp.check_in ?
      new Date(emp.check_in).getHours() * 60 + new Date(emp.check_in).getMinutes() : 0;
    const empCheckOutMin = emp.check_out ?
      new Date(emp.check_out).getHours() * 60 + new Date(emp.check_out).getMinutes() : 0;

    // Calculate overlap
    const overlapStart = Math.max(empCheckInMin, periodStartMin);
    const overlapEnd = Math.min(empCheckOutMin, periodEndMin);
    const overtimeMinutes = Math.max(0, overlapEnd - overlapStart);

    if (overtimeMinutes > 0) {
      // Insert or update overtime record
      await pool.query(`
        INSERT INTO hr_overtime_records
          (employee_id, overtime_date, period_id, actual_minutes, rate_type, validated_for_payroll)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (employee_id, overtime_date, period_id)
        DO UPDATE SET actual_minutes = $4, rate_type = $5, validated_for_payroll = true
      `, [emp.employee_id, period.period_date, periodId, overtimeMinutes, period.rate_type]);

      count++;
    }
  }

  return count;
}

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
