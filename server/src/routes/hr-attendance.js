import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Get attendance records with filters
router.get('/', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  const { employee_id, start_date, end_date, status } = req.query;

  try {
    let query = `
      SELECT
        a.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number
      FROM hr_attendance_records a
      JOIN hr_employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND a.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }

    if (start_date) {
      query += ` AND a.attendance_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND a.attendance_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (status) {
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY a.attendance_date DESC, e.last_name';

    const result = await pool.query(query, params);
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
router.get('/overtime/requests', authenticateToken, requirePermission('hr.attendance.view_page'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT
        o.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number
      FROM hr_overtime_requests o
      JOIN hr_employees e ON o.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND o.status = $1';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching overtime requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create overtime request
router.post('/overtime/requests', authenticateToken, requirePermission('hr.attendance.create'), async (req, res) => {
  try {
    const {
      employee_id,
      request_date,
      start_time,
      end_time,
      reason,
      project_code,
      request_type,
      priority
    } = req.body;

    // Calculate estimated hours
    const [startH, startM] = start_time.split(':').map(Number);
    const [endH, endM] = end_time.split(':').map(Number);
    const estimated_hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;

    const result = await pool.query(`
      INSERT INTO hr_overtime_requests (
        employee_id, request_date, start_time, end_time,
        estimated_hours, reason, project_code, request_type,
        priority, requested_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      employee_id, request_date, start_time, end_time,
      estimated_hours, reason, project_code,
      request_type || 'planned', priority || 'normal',
      req.user.id
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating overtime request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve overtime request
router.put('/overtime/requests/:id/approve', authenticateToken, requirePermission('hr.leaves.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { level, comment } = req.body; // level: 'n1' or 'n2'

    let updateField, statusField;
    if (level === 'n1') {
      updateField = 'n1_approver_id';
      statusField = 'n1_approved_at';
    } else {
      updateField = 'n2_approver_id';
      statusField = 'n2_approved_at';
    }

    const result = await pool.query(`
      UPDATE hr_overtime_requests
      SET
        ${updateField} = $2,
        ${statusField} = NOW(),
        ${level}_comment = $3,
        status = CASE
          WHEN '${level}' = 'n2' THEN 'approved'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, req.user.id, comment]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error approving overtime:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
