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
    const employee = await getEmployeeByProfileId(pool, req.user.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Aucun employé trouvé pour cet utilisateur'
      });
    }

    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);

    // Get attendance records for the month
    const records = await pool.query(`
      SELECT
        DATE(clock_time) as date,
        MIN(CASE WHEN status = 'check_in' THEN clock_time END) as check_in,
        MAX(CASE WHEN status = 'check_out' THEN clock_time END) as check_out,
        COUNT(CASE WHEN status = 'check_in' THEN 1 END) as check_ins,
        COUNT(CASE WHEN status = 'check_out' THEN 1 END) as check_outs
      FROM hr_attendance_records
      WHERE employee_id = $1
        AND EXTRACT(YEAR FROM clock_time) = $2
        AND EXTRACT(MONTH FROM clock_time) = $3
      GROUP BY DATE(clock_time)
      ORDER BY DATE(clock_time) DESC
    `, [employee.id, targetYear, targetMonth]);

    // Get leaves for the month
    const leaves = await pool.query(`
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

    // Get holidays for the month
    const holidays = await pool.query(`
      SELECT holiday_date, name
      FROM hr_holidays
      WHERE EXTRACT(YEAR FROM holiday_date) = $1
        AND EXTRACT(MONTH FROM holiday_date) = $2
        AND (segment_id IS NULL OR segment_id = $3)
    `, [targetYear, targetMonth, employee.segment_id]);

    // Calculate stats
    const presentDays = records.rows.filter(r => r.check_ins > 0).length;
    const leaveDays = leaves.rows.reduce((acc, l) => {
      const start = new Date(l.start_date);
      const end = new Date(l.end_date);
      return acc + Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }, 0);

    // Calculate total hours and late minutes
    let totalMinutes = 0;
    let totalLateMinutes = 0;
    const scheduleStart = '08:00';

    records.rows.forEach(r => {
      if (r.check_in && r.check_out) {
        const checkIn = new Date(r.check_in);
        const checkOut = new Date(r.check_out);
        const workedMinutes = Math.floor((checkOut - checkIn) / 1000 / 60) - 60; // minus break
        totalMinutes += Math.max(0, workedMinutes);

        // Calculate late minutes
        const scheduleTime = new Date(r.date);
        const [hours, mins] = scheduleStart.split(':');
        scheduleTime.setHours(parseInt(hours), parseInt(mins), 0);
        if (checkIn > scheduleTime) {
          totalLateMinutes += Math.floor((checkIn - scheduleTime) / 1000 / 60);
        }
      }
    });

    res.json({
      success: true,
      year: parseInt(targetYear),
      month: parseInt(targetMonth),
      records: records.rows.map(r => ({
        date: r.date,
        check_in: r.check_in ? new Date(r.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
        check_out: r.check_out ? new Date(r.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
        status: r.check_ins > 0 ? 'present' : 'absent'
      })),
      leaves: leaves.rows,
      holidays: holidays.rows,
      stats: {
        total_hours: (totalMinutes / 60).toFixed(1),
        present_days: presentDays,
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
    const employee = await getEmployeeByProfileId(pool, req.user.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Aucun employé trouvé pour cet utilisateur'
      });
    }

    // Get leave requests
    const leaveRequests = await pool.query(`
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

    // Get overtime requests
    const overtimeRequests = await pool.query(`
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
    const result = await pool.query(`
      SELECT id, code, name, is_paid, max_days_per_year
      FROM hr_leave_types
      WHERE is_active = true
      ORDER BY name
    `);

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
