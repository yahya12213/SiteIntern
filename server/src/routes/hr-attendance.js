import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Get attendance records with filters
// Reconstruit les entrées/sorties à partir de clock_time (nouveau modèle)
router.get('/', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  const { employee_id, start_date, end_date, status } = req.query;

  try {
    // Requête qui groupe par jour et pivote les clock_time par statut
    let baseQuery = `
      SELECT
        a.employee_id,
        DATE(a.clock_time) as attendance_date,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        to_char(MIN(a.clock_time), 'HH24:MI') as check_in_time,
        CASE WHEN COUNT(*) > 1 THEN to_char(MAX(a.clock_time), 'HH24:MI') ELSE NULL END as check_out_time,
        MAX(CASE WHEN a.status NOT IN ('check_in', 'check_out') THEN a.status ELSE NULL END) as status,
        MAX(a.worked_minutes) as worked_minutes,
        MAX(a.late_minutes) as late_minutes,
        MAX(a.early_leave_minutes) as early_leave_minutes,
        MAX(a.overtime_minutes) as overtime_minutes,
        bool_or(a.is_anomaly) as is_anomaly,
        MAX(a.anomaly_type) as anomaly_type,
        MAX(a.id) as id
      FROM hr_attendance_records a
      JOIN hr_employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (employee_id) {
      baseQuery += ` AND a.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }

    if (start_date) {
      baseQuery += ` AND DATE(a.clock_time) >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      baseQuery += ` AND DATE(a.clock_time) <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    // Filtre par statut sur le statut final (pas check_in/check_out)
    if (status) {
      baseQuery += ` AND EXISTS (
        SELECT 1 FROM hr_attendance_records ar
        WHERE ar.employee_id = a.employee_id
        AND DATE(ar.clock_time) = DATE(a.clock_time)
        AND ar.status = $${paramCount}
      )`;
      params.push(status);
      paramCount++;
    }

    baseQuery += ` GROUP BY a.employee_id, DATE(a.clock_time), e.first_name, e.last_name, e.employee_number`;
    baseQuery += ` ORDER BY DATE(a.clock_time) DESC, e.last_name`;

    const result = await pool.query(baseQuery, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record attendance (check-in/check-out)
router.post('/record', authenticateToken, requirePermission('hr.attendance.create'), async (req, res) => {
  try {
    const {
      employee_id,
      attendance_date,
      check_in_time,
      check_out_time,
      break_minutes,
      status,
      notes,
      source
    } = req.body;

    // Calculate worked hours if both times provided
    let worked_minutes = null;
    if (check_in_time && check_out_time) {
      const [inH, inM] = check_in_time.split(':').map(Number);
      const [outH, outM] = check_out_time.split(':').map(Number);
      worked_minutes = (outH * 60 + outM) - (inH * 60 + inM) - (break_minutes || 0);
    }

    const result = await pool.query(`
      INSERT INTO hr_attendance_records (
        employee_id, attendance_date, check_in_time, check_out_time,
        break_minutes, worked_minutes, status, notes, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (employee_id, attendance_date)
      DO UPDATE SET
        check_in_time = COALESCE(EXCLUDED.check_in_time, hr_attendance_records.check_in_time),
        check_out_time = COALESCE(EXCLUDED.check_out_time, hr_attendance_records.check_out_time),
        break_minutes = COALESCE(EXCLUDED.break_minutes, hr_attendance_records.break_minutes),
        worked_minutes = COALESCE(EXCLUDED.worked_minutes, hr_attendance_records.worked_minutes),
        status = COALESCE(EXCLUDED.status, hr_attendance_records.status),
        notes = COALESCE(EXCLUDED.notes, hr_attendance_records.notes),
        updated_at = NOW()
      RETURNING *
    `, [
      employee_id, attendance_date, check_in_time, check_out_time,
      break_minutes || 0, worked_minutes, status || 'present',
      notes, source || 'manual'
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Correct attendance record
router.put('/:id/correct', authenticateToken, requirePermission('hr.attendance.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in_time, check_out_time, correction_reason } = req.body;

    // Save original values first
    const original = await pool.query(
      'SELECT check_in_time, check_out_time FROM hr_attendance_records WHERE id = $1',
      [id]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    // Calculate new worked minutes
    let worked_minutes = null;
    if (check_in_time && check_out_time) {
      const [inH, inM] = check_in_time.split(':').map(Number);
      const [outH, outM] = check_out_time.split(':').map(Number);
      worked_minutes = (outH * 60 + outM) - (inH * 60 + inM);
    }

    const result = await pool.query(`
      UPDATE hr_attendance_records
      SET
        original_check_in = COALESCE(original_check_in, $2),
        original_check_out = COALESCE(original_check_out, $3),
        check_in_time = $4,
        check_out_time = $5,
        worked_minutes = $6,
        corrected_by = $7,
        correction_reason = $8,
        corrected_at = NOW(),
        is_manual_entry = true,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      id,
      original.rows[0].check_in_time,
      original.rows[0].check_out_time,
      check_in_time,
      check_out_time,
      worked_minutes,
      req.user.id,
      correction_reason
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error correcting attendance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === HELPER FUNCTIONS ===

/**
 * Validate time format (HH:MM)
 */
function validateTimeFormat(timeString) {
  if (!timeString) return true; // Optional field
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeString);
}

/**
 * Calculate worked minutes between check-in and check-out times
 */
function calculateWorkedMinutes(checkIn, checkOut, breakMinutes = 0) {
  if (!checkIn || !checkOut) return null;

  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);

  return Math.max(0, totalMinutes - breakMinutes);
}

/**
 * Cancel pending correction requests for an employee on a specific date
 */
async function cancelPendingCorrectionRequest(employeeId, date, adminUserId) {
  try {
    const result = await pool.query(`
      UPDATE hr_attendance_correction_requests
      SET
        status = 'cancelled',
        admin_cancelled_at = NOW(),
        admin_cancelled_by = $3,
        admin_cancellation_reason = 'Remplacée par correction admin directe',
        updated_at = NOW()
      WHERE employee_id = $1
        AND request_date = $2
        AND status IN ('pending', 'approved_n1', 'approved_n2')
      RETURNING id
    `, [employeeId, date, adminUserId]);

    return result.rows.length > 0 ? result.rows : null;
  } catch (error) {
    console.error('Error cancelling correction request:', error);
    return null;
  }
}

/**
 * Get employee's work schedule break duration for a specific date
 */
async function getEmployeeBreakDuration(employeeId, date) {
  try {
    const result = await pool.query(`
      SELECT ws.break_duration_minutes
      FROM hr_employee_schedules es
      JOIN hr_work_schedules ws ON es.schedule_id = ws.id
      WHERE es.employee_id = $1
        AND es.start_date <= $2
        AND (es.end_date IS NULL OR es.end_date >= $2)
      ORDER BY es.start_date DESC
      LIMIT 1
    `, [employeeId, date]);

    if (result.rows.length > 0) {
      return result.rows[0].break_duration_minutes || 0;
    }

    // Fallback: get default schedule
    const defaultResult = await pool.query(`
      SELECT break_duration_minutes
      FROM hr_work_schedules
      WHERE is_default = true AND is_active = true
      LIMIT 1
    `);

    return defaultResult.rows[0]?.break_duration_minutes || 0;
  } catch (error) {
    console.error('Error getting employee break duration:', error);
    return 0; // Fallback to 0 if error
  }
}

// === ADMIN ATTENDANCE MANAGEMENT ===

// Get attendance by employee and date
router.get('/by-date', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  try {
    const { employee_id, date } = req.query;

    // Validation
    if (!employee_id || !date) {
      return res.status(400).json({
        success: false,
        error: 'employee_id et date sont requis'
      });
    }

    // Get employee info
    const employeeResult = await pool.query(`
      SELECT
        id,
        first_name || ' ' || last_name as name,
        employee_number
      FROM hr_employees
      WHERE id = $1
    `, [employee_id]);

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employé non trouvé'
      });
    }

    const employee = employeeResult.rows[0];

    // Get attendance records for this date
    const recordsResult = await pool.query(`
      SELECT *
      FROM hr_attendance_records
      WHERE employee_id = $1 AND attendance_date = $2
      ORDER BY created_at ASC
    `, [employee_id, date]);

    // Get pending correction requests
    const correctionResult = await pool.query(`
      SELECT *
      FROM hr_attendance_correction_requests
      WHERE employee_id = $1
        AND request_date = $2
        AND status IN ('pending', 'approved_n1', 'approved_n2')
      LIMIT 1
    `, [employee_id, date]);

    // Check for public holidays
    const holidayResult = await pool.query(`
      SELECT name
      FROM hr_public_holidays
      WHERE holiday_date = $1
      LIMIT 1
    `, [date]);

    // Check for recovery declarations
    const recoveryResult = await pool.query(`
      SELECT rd.recovery_period_id, rp.name as recovery_name
      FROM hr_recovery_declarations rd
      JOIN hr_recovery_periods rp ON rd.recovery_period_id = rp.id
      WHERE rd.employee_id = $1 AND rd.recovery_date = $2
      LIMIT 1
    `, [employee_id, date]);

    res.json({
      success: true,
      data: {
        employee,
        date,
        has_records: recordsResult.rows.length > 0,
        records: recordsResult.rows,
        pending_correction_request: correctionResult.rows[0] || null,
        public_holiday: holidayResult.rows[0] || null,
        recovery_day: recoveryResult.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin edit/declare attendance
router.put('/admin/edit', authenticateToken, requirePermission('hr.attendance.edit'), async (req, res) => {
  try {
    const {
      employee_id,
      date,
      action, // 'edit' or 'declare'
      check_in_time,
      check_out_time,
      status,
      absence_status,
      notes,
      correction_reason
    } = req.body;

    // Validation
    if (!employee_id || !date) {
      return res.status(400).json({
        success: false,
        error: 'employee_id et date sont requis'
      });
    }

    if (!action || !['edit', 'declare'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action doit être "edit" ou "declare"'
      });
    }

    // Validate time formats
    if (check_in_time && !validateTimeFormat(check_in_time)) {
      return res.status(400).json({
        success: false,
        error: 'Format check_in_time invalide (HH:MM requis)'
      });
    }

    if (check_out_time && !validateTimeFormat(check_out_time)) {
      return res.status(400).json({
        success: false,
        error: 'Format check_out_time invalide (HH:MM requis)'
      });
    }

    // Validate check_out > check_in
    if (check_in_time && check_out_time) {
      const [inH, inM] = check_in_time.split(':').map(Number);
      const [outH, outM] = check_out_time.split(':').map(Number);
      if ((outH * 60 + outM) <= (inH * 60 + inM)) {
        return res.status(400).json({
          success: false,
          error: 'L\'heure de sortie doit être après l\'heure d\'entrée'
        });
      }
    }

    // Verify employee exists
    const employeeCheck = await pool.query(
      'SELECT id FROM hr_employees WHERE id = $1',
      [employee_id]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employé non trouvé'
      });
    }

    // Cancel any pending correction requests
    await cancelPendingCorrectionRequest(employee_id, date, req.user.id);

    if (action === 'edit') {
      // EDIT existing record(s)

      if (!correction_reason || correction_reason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Une raison de correction (min 10 caractères) est requise'
        });
      }

      // Get existing record(s) for audit trail
      const existing = await pool.query(`
        SELECT * FROM hr_attendance_records
        WHERE employee_id = $1 AND attendance_date = $2
        ORDER BY created_at ASC
      `, [employee_id, date]);

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Aucun pointage trouvé pour cette date'
        });
      }

      // Store original values (from first record)
      const originalRecord = existing.rows[0];
      const original_check_in = originalRecord.original_check_in || originalRecord.check_in_time;
      const original_check_out = originalRecord.original_check_out || originalRecord.check_out_time;

      // Delete all existing records for clean slate
      await pool.query(`
        DELETE FROM hr_attendance_records
        WHERE employee_id = $1 AND attendance_date = $2
      `, [employee_id, date]);

      // Get employee's break duration
      const breakMinutes = await getEmployeeBreakDuration(employee_id, date);

      // Calculate worked minutes with break deduction
      const worked_minutes = calculateWorkedMinutes(check_in_time, check_out_time, breakMinutes);

      // Insert corrected record
      const result = await pool.query(`
        INSERT INTO hr_attendance_records (
          employee_id, attendance_date, check_in_time, check_out_time,
          worked_minutes, status, notes,
          original_check_in, original_check_out,
          is_manual_entry, corrected_by, correction_reason, corrected_at,
          source, is_anomaly, anomaly_resolved, anomaly_resolved_by, anomaly_resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, NOW(), 'manual', false, true, $10, NOW())
        RETURNING *
      `, [
        employee_id, date, check_in_time, check_out_time,
        worked_minutes, status || 'present', notes,
        original_check_in, original_check_out,
        req.user.id, correction_reason
      ]);

      return res.json({
        success: true,
        message: 'Pointage corrigé avec succès',
        data: result.rows[0]
      });

    } else if (action === 'declare') {
      // DECLARE new record

      if (!notes || notes.trim().length < 5) {
        return res.status(400).json({
          success: false,
          error: 'Des notes (min 5 caractères) sont requises pour une déclaration'
        });
      }

      // Check no records exist
      const existing = await pool.query(`
        SELECT id FROM hr_attendance_records
        WHERE employee_id = $1 AND attendance_date = $2
      `, [employee_id, date]);

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Des pointages existent déjà pour cette date. Utilisez action="edit" pour les modifier.'
        });
      }

      // Determine final status
      let finalStatus = absence_status || status || 'present';

      // Get employee's break duration
      const breakMinutes = (finalStatus === 'present' && check_in_time && check_out_time)
        ? await getEmployeeBreakDuration(employee_id, date)
        : 0;

      // Calculate worked minutes with break deduction
      const worked_minutes = (finalStatus === 'present' && check_in_time && check_out_time)
        ? calculateWorkedMinutes(check_in_time, check_out_time, breakMinutes)
        : null;

      // Insert new record
      const result = await pool.query(`
        INSERT INTO hr_attendance_records (
          employee_id, attendance_date, check_in_time, check_out_time,
          worked_minutes, status, notes,
          is_manual_entry, source, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'manual', NOW())
        RETURNING *
      `, [
        employee_id, date, check_in_time, check_out_time,
        worked_minutes, finalStatus, notes
      ]);

      return res.json({
        success: true,
        message: 'Journée déclarée avec succès',
        data: result.rows[0]
      });
    }

  } catch (error) {
    console.error('Error in admin/edit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get anomalies
router.get('/anomalies', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number
      FROM hr_attendance_records a
      JOIN hr_employees e ON a.employee_id = e.id
      WHERE a.is_anomaly = true AND a.anomaly_resolved = false
      ORDER BY a.attendance_date DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve anomaly
router.put('/anomalies/:id/resolve', authenticateToken, requirePermission('hr.attendance.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_note } = req.body;

    const result = await pool.query(`
      UPDATE hr_attendance_records
      SET
        anomaly_resolved = true,
        anomaly_resolved_by = $2,
        anomaly_resolved_at = NOW(),
        anomaly_resolution_note = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, req.user.id, resolution_note]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error resolving anomaly:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === OVERTIME ===

// Get overtime requests
// === OVERTIME ROUTES MOVED TO hr-overtime.js ===
// See server/src/routes/hr-overtime.js for overtime request endpoints

// Get work schedules
router.get('/schedules', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM hr_work_schedules
      WHERE is_active = true
      ORDER BY name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Monthly summary
router.get('/summary/:year/:month', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  try {
    const { year, month } = req.params;
    const result = await pool.query(`
      SELECT
        e.id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as days_present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as days_absent,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as days_late,
        COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as days_leave,
        SUM(a.worked_minutes) / 60.0 as total_hours,
        SUM(CASE WHEN a.late_minutes > 0 THEN a.late_minutes ELSE 0 END) as total_late_minutes
      FROM hr_employees e
      LEFT JOIN hr_attendance_records a ON e.id = a.employee_id
        AND EXTRACT(YEAR FROM a.attendance_date) = $1
        AND EXTRACT(MONTH FROM a.attendance_date) = $2
      WHERE e.employment_status = 'active'
      GROUP BY e.id, e.first_name, e.last_name, e.employee_number
      ORDER BY e.last_name
    `, [year, month]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
