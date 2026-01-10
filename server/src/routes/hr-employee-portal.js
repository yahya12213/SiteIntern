import express from 'express';
import pg from 'pg';
import { authenticateToken } from '../middleware/auth.js';

const { Pool } = pg;
const router = express.Router();

// Get pool connection
const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper: Get employee by profile_id
const getEmployeeByProfileId = async (pool, profileId) => {
  const result = await pool.query(`
    SELECT
      e.id, e.first_name, e.last_name, e.employee_number, e.position,
      e.department, e.hire_date, e.email, e.phone, e.requires_clocking,
      e.segment_id
    FROM hr_employees e
    WHERE e.profile_id = $1
  `, [profileId]);
  return result.rows[0];
};

// GET /api/hr/employee-portal/profile - Get current employee profile
router.get('/profile', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const employee = await getEmployeeByProfileId(pool, req.user.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Aucun employé trouvé pour cet utilisateur'
      });
    }

    // Get leave balances
    const balances = await pool.query(`
      SELECT lt.code, lt.name, lb.current_balance, lb.taken, lb.initial_balance
      FROM hr_leave_balances lb
      JOIN hr_leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = $1 AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [employee.id]);

    // Get active contract
    const contract = await pool.query(`
      SELECT contract_type, start_date, end_date, salary_gross, working_hours_per_week
      FROM hr_contracts
      WHERE employee_id = $1 AND status = 'active'
      ORDER BY start_date DESC
      LIMIT 1
    `, [employee.id]);

    res.json({
      success: true,
      employee: {
        ...employee,
        leave_balances: balances.rows,
        contract: contract.rows[0] || null
      }
    });

  } catch (error) {
    console.error('Error in profile:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du profil',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// GET /api/hr/employee-portal/attendance - Get attendance records
router.get('/attendance', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const { year, month } = req.query;

    let employee;
    try {
      employee = await getEmployeeByProfileId(pool, req.user.id);
    } catch (err) {
      console.error('Error getting employee:', err.message);
      // Return empty data if employee table has issues
      return res.json({
        success: true,
        year: parseInt(year || new Date().getFullYear()),
        month: parseInt(month || (new Date().getMonth() + 1)),
        records: [],
        leaves: [],
        holidays: [],
        stats: { total_hours: '0', present_days: 0, leave_days: 0, late_minutes: 0 }
      });
    }

    if (!employee) {
      // Return empty data instead of 404 for better UX
      return res.json({
        success: true,
        year: parseInt(year || new Date().getFullYear()),
        month: parseInt(month || (new Date().getMonth() + 1)),
        records: [],
        leaves: [],
        holidays: [],
        stats: { total_hours: '0', present_days: 0, leave_days: 0, late_minutes: 0 }
      });
    }

    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);

    // Get attendance records for the month (with try/catch for missing table)
    let records = { rows: [] };
    try {
      records = await pool.query(`
        SELECT
          attendance_date as date,
          MIN(CASE WHEN status IN ('check_in', 'late', 'weekend') THEN clock_time END) as check_in,
          MAX(CASE WHEN status IN ('check_out', 'weekend') THEN clock_time END) as check_out,
          COUNT(CASE WHEN status IN ('check_in', 'late', 'weekend') THEN 1 END) as check_ins,
          COUNT(CASE WHEN status IN ('check_out', 'weekend') THEN 1 END) as check_outs
        FROM hr_attendance_records
        WHERE employee_id = $1
          AND EXTRACT(YEAR FROM attendance_date) = $2
          AND EXTRACT(MONTH FROM attendance_date) = $3
        GROUP BY attendance_date
        ORDER BY attendance_date DESC
      `, [employee.id, targetYear, targetMonth]);

      // DEBUG LOG - À supprimer après diagnostic
      console.log(`📊 ATTENDANCE DEBUG: employee_id=${employee.id}, year=${targetYear}, month=${targetMonth}, records_count=${records.rows.length}`);
      if (records.rows.length > 0) {
        console.log(`📊 ATTENDANCE DATES:`, records.rows.map(r => r.date));
      }
    } catch (err) {
      console.log('Warning: hr_attendance_records table issue:', err.message);
    }

    // Get leaves for the month (with try/catch for missing tables)
    let leaves = { rows: [] };
    try {
      leaves = await pool.query(`
        SELECT start_date, end_date, lt.name as leave_type
        FROM hr_leave_requests lr
        JOIN hr_leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.employee_id = $1
          AND lr.status = 'approved'
          AND (
            (EXTRACT(YEAR FROM lr.start_date) = $2 AND EXTRACT(MONTH FROM lr.start_date) = $3)
            OR (EXTRACT(YEAR FROM lr.end_date) = $2 AND EXTRACT(MONTH FROM lr.end_date) = $3)
          )
      `, [employee.id, targetYear, targetMonth]);
    } catch (err) {
      console.log('Warning: hr_leave_requests/hr_leave_types table issue:', err.message);
    }

    // Get holidays for the month (with try/catch for missing table)
    let holidays = { rows: [] };
    try {
      holidays = await pool.query(`
        SELECT holiday_date, name
        FROM hr_holidays
        WHERE EXTRACT(YEAR FROM holiday_date) = $1
          AND EXTRACT(MONTH FROM holiday_date) = $2
          AND (segment_id IS NULL OR segment_id = $3)
      `, [targetYear, targetMonth, employee.segment_id]);
    } catch (err) {
      console.log('Warning: hr_holidays table issue:', err.message);
    }

    // Calculate stats
    const presentDays = records.rows.filter(r => r.check_ins > 0).length;
    const leaveDays = leaves.rows.reduce((acc, l) => {
      const start = new Date(l.start_date);
      const end = new Date(l.end_date);
      return acc + Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }, 0);

    // Fetch active schedule from database
    let schedule = { tolerance_late_minutes: 15, min_hours_for_half_day: 4 };
    try {
      const activeScheduleResult = await pool.query(`
        SELECT
          monday_start, monday_end,
          tuesday_start, tuesday_end,
          wednesday_start, wednesday_end,
          thursday_start, thursday_end,
          friday_start, friday_end,
          saturday_start, saturday_end,
          sunday_start, sunday_end,
          break_start, break_end,
          tolerance_late_minutes,
          min_hours_for_half_day
        FROM hr_work_schedules
        WHERE is_active = true
        LIMIT 1
      `);
      if (activeScheduleResult.rows.length > 0) {
        schedule = activeScheduleResult.rows[0];
      }
    } catch (err) {
      console.log('Warning: Could not fetch active schedule, using defaults:', err.message);
    }

    // Calculate total hours, late minutes, and days worked
    let totalMinutes = 0;
    let totalLateMinutes = 0;
    let daysWorked = 0;

    records.rows.forEach(r => {
      if (!r.check_in || !r.check_out) return;

      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      const recordDate = new Date(r.date);
      const dayOfWeek = recordDate.getDay();

      // Get day-specific schedule (0=Sunday, 1=Monday, ..., 6=Saturday)
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      const scheduledStart = schedule[`${dayName}_start`];
      const scheduledEnd = schedule[`${dayName}_end`];

      if (!scheduledStart || !scheduledEnd) return; // No schedule for this day

      // Calculate raw worked minutes
      let workedMinutes = Math.floor((checkOut - checkIn) / 1000 / 60);

      // Deduct break time if overlaps AND worked >= 4 hours
      if (workedMinutes >= 240 && schedule.break_start && schedule.break_end) {
        const breakStart = new Date(r.date + ' ' + schedule.break_start);
        const breakEnd = new Date(r.date + ' ' + schedule.break_end);

        // Check for overlap between work period and break period
        if (checkIn < breakEnd && checkOut > breakStart) {
          const overlapStart = checkIn > breakStart ? checkIn : breakStart;
          const overlapEnd = checkOut < breakEnd ? checkOut : breakEnd;
          const overlapMinutes = Math.floor((overlapEnd - overlapStart) / 1000 / 60);
          workedMinutes -= overlapMinutes;
        }
      }

      totalMinutes += Math.max(0, workedMinutes);

      // Calculate days worked: 1 day if >= 6h, 0.5 if >= 4h (min_hours_for_half_day), 0 otherwise
      const hoursWorked = workedMinutes / 60;
      if (hoursWorked >= 6) {
        daysWorked += 1;
      } else if (hoursWorked >= (schedule.min_hours_for_half_day || 4)) {
        daysWorked += 0.5;
      }

      // Calculate late minutes based on scheduled start time + tolerance
      const [schedStartHour, schedStartMin] = scheduledStart.split(':').map(Number);
      const scheduleTime = new Date(r.date);
      scheduleTime.setHours(schedStartHour, schedStartMin, 0, 0);

      const tolerance = schedule.tolerance_late_minutes || 15;
      const scheduleTimeWithTolerance = new Date(scheduleTime.getTime() + tolerance * 60 * 1000);

      if (checkIn > scheduleTimeWithTolerance) {
        totalLateMinutes += Math.floor((checkIn - scheduleTime) / 1000 / 60);
      }
    });

    // Get correction requests for this employee in the month
    let correctionRequests = [];
    try {
      const correctionResult = await pool.query(`
        SELECT id, request_date, requested_check_in, requested_check_out, reason, status, created_at
        FROM hr_attendance_correction_requests
        WHERE employee_id = $1
          AND EXTRACT(YEAR FROM request_date) = $2
          AND EXTRACT(MONTH FROM request_date) = $3
      `, [employee.id, targetYear, targetMonth]);
      correctionRequests = correctionResult.rows;
    } catch (err) {
      console.log('Warning: Could not fetch correction requests:', err.message);
    }

    // Helper to get current approval level from status
    const getCurrentApprovalLevel = (status) => {
      if (status === 'pending') return 0;
      if (status === 'approved_n1') return 1;
      if (status === 'approved_n2') return 2;
      const match = status?.match(/approved_n(\d+)/);
      if (match) return parseInt(match[1]);
      return 0;
    };

    // For each correction request, get the current approver's name
    for (const cr of correctionRequests) {
      if (cr.status !== 'approved' && cr.status !== 'rejected') {
        const currentLevel = getCurrentApprovalLevel(cr.status);
        try {
          const approverResult = await pool.query(`
            SELECT m.first_name || ' ' || m.last_name as approver_name
            FROM hr_employee_managers em
            JOIN hr_employees m ON em.manager_id = m.id
            WHERE em.employee_id = $1 AND em.rank = $2 AND em.is_active = true
          `, [employee.id, currentLevel]);
          cr.current_approver_name = approverResult.rows[0]?.approver_name || null;
        } catch (err) {
          console.log('Warning: Could not fetch approver name:', err.message);
          cr.current_approver_name = null;
        }
      } else {
        cr.current_approver_name = null;
      }
    }

    // Create a map of correction requests by date
    const correctionsByDate = {};
    correctionRequests.forEach(cr => {
      const dateKey = cr.request_date instanceof Date
        ? cr.request_date.toISOString().split('T')[0]
        : cr.request_date;
      correctionsByDate[dateKey] = {
        id: cr.id,
        status: cr.status,
        requested_check_in: cr.requested_check_in,
        requested_check_out: cr.requested_check_out,
        reason: cr.reason,
        created_at: cr.created_at,
        current_approver_name: cr.current_approver_name
      };
    });

    // Calculate worked minutes for each record (capped to schedule)
    const recordsWithWorkedMinutes = records.rows.map(r => {
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
      const correctionRequest = correctionsByDate[dateStr] || null;
      const hasAnomaly = r.check_ins > 0 && (!r.check_out || r.check_outs === 0);

      if (!r.check_in || !r.check_out) {
        return {
          date: r.date,
          check_in: r.check_in ? new Date(r.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
          check_out: r.check_out ? new Date(r.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
          status: r.check_ins > 0 ? 'present' : 'absent',
          worked_minutes: null,
          has_anomaly: hasAnomaly,
          correction_request: correctionRequest
        };
      }

      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      const recordDate = new Date(r.date);
      const dayOfWeek = recordDate.getDay();

      // Get day-specific schedule
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      const scheduledStart = schedule[`${dayName}_start`];
      const scheduledEnd = schedule[`${dayName}_end`];

      let checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
      let checkOutMinutes = checkOut.getHours() * 60 + checkOut.getMinutes();

      // Cap to schedule if available
      if (scheduledStart && scheduledEnd) {
        const [startH, startM] = scheduledStart.split(':').map(Number);
        const [endH, endM] = scheduledEnd.split(':').map(Number);
        const schedStartMinutes = startH * 60 + startM;
        const schedEndMinutes = endH * 60 + endM;

        if (checkInMinutes < schedStartMinutes) checkInMinutes = schedStartMinutes;
        if (checkOutMinutes > schedEndMinutes) checkOutMinutes = schedEndMinutes;
      }

      let workedMinutes = Math.max(0, checkOutMinutes - checkInMinutes);

      // Deduct break time if worked >= 4 hours
      if (workedMinutes >= 240 && schedule.break_start && schedule.break_end) {
        const [breakStartH, breakStartM] = schedule.break_start.split(':').map(Number);
        const [breakEndH, breakEndM] = schedule.break_end.split(':').map(Number);
        const breakDuration = (breakEndH * 60 + breakEndM) - (breakStartH * 60 + breakStartM);
        workedMinutes -= Math.max(0, breakDuration);
      }

      return {
        date: r.date,
        check_in: new Date(r.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        check_out: new Date(r.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: r.check_ins > 0 ? 'present' : 'absent',
        worked_minutes: Math.max(0, workedMinutes),
        has_anomaly: hasAnomaly,
        correction_request: correctionRequest
      };
    });

    res.json({
      success: true,
      year: parseInt(targetYear),
      month: parseInt(targetMonth),
      records: recordsWithWorkedMinutes,
      leaves: leaves.rows,
      holidays: holidays.rows,
      stats: {
        total_hours: (totalMinutes / 60).toFixed(1),
        present_days: presentDays,
        days_worked: daysWorked,
        leave_days: leaveDays,
        late_minutes: totalLateMinutes
      }
    });

  } catch (error) {
    console.error('Error in attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des pointages',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// GET /api/hr/employee-portal/requests - Get my HR requests
router.get('/requests', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    let employee;
    try {
      employee = await getEmployeeByProfileId(pool, req.user.id);
    } catch (err) {
      console.error('Error getting employee for requests:', err.message);
      return res.json({ success: true, requests: [] });
    }

    if (!employee) {
      return res.json({ success: true, requests: [] });
    }

    // Get leave requests (with try/catch for missing tables)
    let leaveRequests = { rows: [] };
    try {
      leaveRequests = await pool.query(`
        SELECT
          lr.id,
          'leave' as request_type,
          lt.code as type_code,
          lt.name as type_name,
          lr.start_date,
          lr.end_date,
          lr.days_requested,
          lr.reason as description,
          lr.status,
          lr.created_at as date_soumission,
          lr.n1_comment,
          lr.n2_comment,
          lr.hr_comment
        FROM hr_leave_requests lr
        JOIN hr_leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.employee_id = $1
        ORDER BY lr.created_at DESC
        LIMIT 50
      `, [employee.id]);
    } catch (err) {
      console.log('Warning: hr_leave_requests/hr_leave_types table issue:', err.message);
    }

    // Get overtime requests (with try/catch for missing table)
    let overtimeRequests = { rows: [] };
    try {
      overtimeRequests = await pool.query(`
        SELECT
          id,
          'overtime' as request_type,
          'heures_sup' as type_code,
          'Heures supplémentaires' as type_name,
          request_date as start_date,
          request_date as end_date,
          estimated_hours as days_requested,
          reason as description,
          status,
          created_at as date_soumission,
          approver_comment as n1_comment
        FROM hr_overtime_requests
        WHERE employee_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [employee.id]);
    } catch (err) {
      console.log('Warning: hr_overtime_requests table issue:', err.message);
    }

    // Combine and sort
    const allRequests = [...leaveRequests.rows, ...overtimeRequests.rows]
      .sort((a, b) => new Date(b.date_soumission) - new Date(a.date_soumission));

    res.json({
      success: true,
      requests: allRequests
    });

  } catch (error) {
    console.error('Error in requests:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des demandes',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// POST /api/hr/employee-portal/requests - Submit new request
router.post('/requests', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const { type, start_date, end_date, description } = req.body;

    const employee = await getEmployeeByProfileId(pool, req.user.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Aucun employé trouvé pour cet utilisateur'
      });
    }

    // Validate required fields
    if (!type || !description) {
      return res.status(400).json({
        success: false,
        error: 'Type et description sont obligatoires'
      });
    }

    // Handle based on request type
    if (type.startsWith('conge_') || type === 'conge_annuel' || type === 'conge_sans_solde' || type === 'conge_maladie') {
      // Leave request
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          error: 'Dates de début et fin obligatoires pour les congés'
        });
      }

      // Get leave type
      const leaveTypeMap = {
        'conge_annuel': 'ANNUAL',
        'conge_sans_solde': 'UNPAID',
        'conge_maladie': 'SICK'
      };

      const leaveType = await pool.query(`
        SELECT id FROM hr_leave_types WHERE code = $1
      `, [leaveTypeMap[type] || 'ANNUAL']);

      if (leaveType.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Type de congé non trouvé'
        });
      }

      // Calculate days
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      // Insert leave request
      const result = await pool.query(`
        INSERT INTO hr_leave_requests (
          employee_id, leave_type_id, start_date, end_date,
          days_requested, reason, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
        RETURNING id
      `, [employee.id, leaveType.rows[0].id, start_date, end_date, days, description]);

      res.json({
        success: true,
        message: 'Demande de congé soumise avec succès',
        request_id: result.rows[0].id
      });

    } else if (type === 'heures_sup') {
      // Overtime request
      const result = await pool.query(`
        INSERT INTO hr_overtime_requests (
          employee_id, request_date, reason, status, created_at
        ) VALUES ($1, $2, $3, 'pending', NOW())
        RETURNING id
      `, [employee.id, start_date || new Date(), description]);

      res.json({
        success: true,
        message: 'Demande d\'heures supplémentaires soumise avec succès',
        request_id: result.rows[0].id
      });

    } else {
      // Generic HR request - store as leave request with special type
      const result = await pool.query(`
        INSERT INTO hr_leave_requests (
          employee_id, leave_type_id, start_date, end_date,
          days_requested, reason, status, created_at
        ) VALUES ($1,
          (SELECT id FROM hr_leave_types WHERE code = 'OTHER' LIMIT 1),
          COALESCE($2, CURRENT_DATE), COALESCE($3, CURRENT_DATE),
          0, $4, 'pending', NOW())
        RETURNING id
      `, [employee.id, start_date, end_date, `[${type}] ${description}`]);

      res.json({
        success: true,
        message: 'Demande soumise avec succès',
        request_id: result.rows[0].id
      });
    }

  } catch (error) {
    console.error('Error in create request:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la demande',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// GET /api/hr/employee-portal/leave-types - Get available leave types
router.get('/leave-types', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    let result = { rows: [] };
    try {
      result = await pool.query(`
        SELECT id, code, name, is_paid, max_days_per_year
        FROM hr_leave_types
        WHERE is_active = true
        ORDER BY name
      `);
    } catch (err) {
      console.log('Warning: hr_leave_types table issue:', err.message);
      // Return default leave types if table doesn't exist
      result.rows = [
        { id: 1, code: 'ANNUAL', name: 'Congé annuel', is_paid: true, max_days_per_year: 30 },
        { id: 2, code: 'SICK', name: 'Congé maladie', is_paid: true, max_days_per_year: 15 },
        { id: 3, code: 'UNPAID', name: 'Congé sans solde', is_paid: false, max_days_per_year: null }
      ];
    }

    res.json({
      success: true,
      leave_types: result.rows
    });

  } catch (error) {
    console.error('Error in leave-types:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des types de congés',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

export default router;
