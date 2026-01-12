import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import pool from '../config/database.js';
import { ApprovalService, REQUEST_TYPES } from '../services/approval-service.js';

const router = express.Router();

/**
 * Helper: Get team member IDs for a manager
 * Includes both direct reports (manager_id) and indirect reports (hr_employee_managers)
 */
async function getTeamMemberIds(userId) {
  // Get the hr_employee for this user
  const managerEmployee = await pool.query(`
    SELECT id FROM hr_employees WHERE profile_id = $1
  `, [userId]);

  if (managerEmployee.rows.length === 0) {
    return [];
  }

  const managerId = managerEmployee.rows[0].id;

  // Get all employees where this user is manager (direct or via hr_employee_managers)
  const team = await pool.query(`
    SELECT DISTINCT id, profile_id FROM hr_employees
    WHERE (
      manager_id = $1
      OR id IN (
        SELECT employee_id FROM hr_employee_managers
        WHERE manager_id = $1 AND is_active = true
      )
    )
    AND employment_status = 'active'
  `, [managerId]);

  return team.rows;
}

/**
 * Get my team members
 */
router.get('/team',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;

    try {
      // 🔧 FIX: Admin voit tous les employés
      const isAdmin = req.user.role === 'admin';

      if (isAdmin) {
        const team = await pool.query(`
          SELECT
            e.id,
            e.id as employee_id,
            e.first_name || ' ' || e.last_name as full_name,
            e.first_name,
            e.last_name,
            e.email,
            e.position,
            e.employee_number,
            e.profile_id,
            p.username,
            s.name as segment_name,
            e.hire_date,
            e.employment_type,
            e.employment_status = 'active' as is_active,
            -- Today's attendance
            (SELECT clock_time FROM hr_attendance_records
             WHERE employee_id = e.id AND status = 'check_in'
             AND DATE(clock_time) = CURRENT_DATE
             ORDER BY clock_time DESC LIMIT 1) as today_check_in,
            (SELECT clock_time FROM hr_attendance_records
             WHERE employee_id = e.id AND status = 'check_out'
             AND DATE(clock_time) = CURRENT_DATE
             ORDER BY clock_time DESC LIMIT 1) as today_check_out,
            -- Leave info
            (SELECT COUNT(*) FROM hr_leave_requests
             WHERE employee_id = e.id AND status = 'approved'
             AND CURRENT_DATE BETWEEN start_date AND end_date) as is_on_leave
          FROM hr_employees e
          LEFT JOIN profiles p ON e.profile_id = p.id
          LEFT JOIN segments s ON e.segment_id = s.id
          WHERE e.employment_status = 'active'
          ORDER BY e.last_name, e.first_name
        `);
        return res.json({ success: true, members: team.rows });
      }

      // Non-admin: logique existante
      // D'abord vérifier si l'utilisateur a un employé HR associé
      const managerCheck = await pool.query(
        'SELECT id FROM hr_employees WHERE profile_id = $1',
        [userId]
      );

      if (managerCheck.rows.length === 0) {
        // L'utilisateur n'est pas un employé HR, retourner tableau vide
        console.log(`Manager team: User ${userId} has no hr_employee record`);
        return res.json({ success: true, members: [] });
      }

      const managerId = managerCheck.rows[0].id;

      const team = await pool.query(`
        SELECT
          e.id,
          e.id as employee_id,
          e.first_name || ' ' || e.last_name as full_name,
          e.first_name,
          e.last_name,
          e.email,
          e.position,
          e.employee_number,
          e.profile_id,
          p.username,
          s.name as segment_name,
          e.hire_date,
          e.employment_type,
          e.employment_status = 'active' as is_active,
          -- Today's attendance (inclut tous les statuts possibles pour check-in)
          (SELECT clock_time FROM hr_attendance_records
           WHERE employee_id = e.id AND status IN ('check_in', 'late', 'weekend', 'present', 'half_day', 'early_leave', 'late_early', 'incomplete')
           AND DATE(clock_time) = CURRENT_DATE
           ORDER BY clock_time ASC LIMIT 1) as today_check_in,
          (SELECT clock_time FROM hr_attendance_records
           WHERE employee_id = e.id AND status = 'check_out'
           AND DATE(clock_time) = CURRENT_DATE
           ORDER BY clock_time DESC LIMIT 1) as today_check_out,
          -- Leave info
          (SELECT COUNT(*) FROM hr_leave_requests
           WHERE employee_id = e.id AND status = 'approved'
           AND CURRENT_DATE BETWEEN start_date AND end_date) as is_on_leave
        FROM hr_employees e
        LEFT JOIN profiles p ON e.profile_id = p.id
        LEFT JOIN segments s ON e.segment_id = s.id
        WHERE (
          e.manager_id = $1
          OR e.id IN (
            SELECT employee_id FROM hr_employee_managers
            WHERE manager_id = $1 AND is_active = true
          )
        )
        AND e.employment_status = 'active'
        ORDER BY e.last_name, e.first_name
      `, [managerId]);

      res.json({ success: true, members: team.rows });
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Get team attendance for a date range
 * Returns aggregated daily records per employee matching TeamAttendanceRecord interface
 */
router.get('/team-attendance',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    try {
      const teamMembers = await getTeamMemberIds(userId);
      if (teamMembers.length === 0) {
        return res.json({ success: true, records: [] });
      }

      const employeeIds = teamMembers.map(t => t.id);

      // Build query that returns data matching TeamAttendanceRecord interface
      let query = `
        WITH daily_records AS (
          SELECT
            ar.employee_id,
            ar.attendance_date as record_date,
            MIN(CASE WHEN ar.status IN ('check_in', 'late', 'weekend', 'present', 'half_day', 'early_leave', 'late_early', 'incomplete') THEN ar.clock_time END) as clock_in,
            MAX(CASE WHEN ar.status IN ('check_out', 'weekend') THEN ar.clock_time END) as clock_out,
            SUM(COALESCE(ar.worked_minutes, 0)) as total_worked_minutes
          FROM hr_attendance_records ar
          WHERE ar.employee_id = ANY($1::uuid[])
      `;
      const params = [employeeIds];
      let paramCount = 2;

      if (start_date) {
        query += ` AND ar.attendance_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }

      if (end_date) {
        query += ` AND ar.attendance_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }

      query += `
          GROUP BY ar.employee_id, ar.attendance_date
        ),
        on_leave AS (
          SELECT lr.employee_id, lr.start_date, lr.end_date, lt.name as leave_type
          FROM hr_leave_requests lr
          LEFT JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
          WHERE lr.status = 'approved'
        )
        SELECT
          dr.employee_id || '-' || dr.record_date as id,
          dr.employee_id,
          e.first_name || ' ' || e.last_name as employee_name,
          dr.record_date as date,
          dr.clock_in,
          dr.clock_out,
          ROUND(dr.total_worked_minutes / 60.0, 2) as worked_hours,
          CASE
            WHEN EXTRACT(DOW FROM dr.record_date) IN (0, 6) THEN 'weekend'
            WHEN ol.employee_id IS NOT NULL THEN 'leave'
            WHEN dr.clock_in IS NULL THEN 'absent'
            WHEN dr.clock_out IS NULL THEN 'partial'
            WHEN EXTRACT(HOUR FROM dr.clock_in) * 60 + EXTRACT(MINUTE FROM dr.clock_in) > 8 * 60 + 15 THEN 'late'
            ELSE 'present'
          END as status,
          CASE
            WHEN EXTRACT(DOW FROM dr.record_date) IN (0, 6) THEN 0
            WHEN dr.clock_in IS NOT NULL AND EXTRACT(HOUR FROM dr.clock_in) * 60 + EXTRACT(MINUTE FROM dr.clock_in) > 8 * 60
            THEN (EXTRACT(HOUR FROM dr.clock_in) * 60 + EXTRACT(MINUTE FROM dr.clock_in) - 8 * 60)::integer
            ELSE 0
          END as late_minutes,
          ol.leave_type,
          NULL as notes
        FROM daily_records dr
        JOIN hr_employees e ON e.id = dr.employee_id
        LEFT JOIN on_leave ol ON ol.employee_id = dr.employee_id
          AND dr.record_date BETWEEN ol.start_date AND ol.end_date
        ORDER BY dr.record_date DESC, e.last_name, e.first_name
      `;

      const result = await pool.query(query, params);
      res.json({ success: true, records: result.rows });
    } catch (error) {
      console.error('Error fetching team attendance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Get team attendance summary (today)
 */
router.get('/team-attendance/today',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;

    try {
      const summary = await pool.query(`
        WITH team AS (
          SELECT e.id, e.first_name, e.last_name, e.employee_number, e.position
          FROM hr_employees e
          WHERE e.manager_id = (SELECT id FROM hr_employees WHERE profile_id = $1)
          AND e.employment_status = 'active'
        ),
        today_records AS (
          SELECT
            t.id,
            t.first_name || ' ' || t.last_name as employee_name,
            t.employee_number,
            t.position,
            (SELECT clock_time FROM hr_attendance_records
             WHERE employee_id = t.id AND status IN ('check_in', 'late', 'weekend', 'present', 'half_day', 'early_leave', 'late_early', 'incomplete')
             AND DATE(clock_time) = CURRENT_DATE
             ORDER BY clock_time ASC LIMIT 1) as first_check_in,
            (SELECT clock_time FROM hr_attendance_records
             WHERE employee_id = t.id AND status = 'check_out'
             AND DATE(clock_time) = CURRENT_DATE
             ORDER BY clock_time DESC LIMIT 1) as last_check_out,
            (SELECT SUM(worked_minutes) FROM hr_attendance_records
             WHERE employee_id = t.id
             AND DATE(clock_time) = CURRENT_DATE) as worked_minutes
          FROM team t
        ),
        on_leave AS (
          SELECT lr.employee_id
          FROM hr_leave_requests lr
          WHERE lr.status = 'approved'
          AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
        )
        SELECT
          tr.*,
          CASE
            WHEN tr.id IN (SELECT employee_id FROM on_leave) THEN 'on_leave'
            WHEN tr.first_check_in IS NOT NULL AND tr.last_check_out IS NULL THEN 'present'
            WHEN tr.first_check_in IS NOT NULL AND tr.last_check_out IS NOT NULL THEN 'completed'
            ELSE 'absent'
          END as status,
          EXTRACT(HOUR FROM tr.first_check_in) * 60 + EXTRACT(MINUTE FROM tr.first_check_in) -
            (8 * 60) as late_minutes
        FROM today_records tr
        ORDER BY tr.employee_name
      `, [userId]);

      // Calculate summary stats
      const stats = {
        total: summary.rows.length,
        present: summary.rows.filter(r => r.status === 'present' || r.status === 'completed').length,
        absent: summary.rows.filter(r => r.status === 'absent').length,
        on_leave: summary.rows.filter(r => r.status === 'on_leave').length,
        late: summary.rows.filter(r => r.late_minutes > 0).length
      };

      res.json({
        success: true,
        data: summary.rows,
        stats
      });
    } catch (error) {
      console.error('Error fetching team attendance today:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Get team leave requests pending my approval
 */
router.get('/team-requests',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;
    const { status = 'pending', type } = req.query;

    try {
      // 🔧 FIX: Admin voit toutes les demandes, pas seulement son équipe
      const isAdmin = req.user.role === 'admin';

      if (isAdmin) {
        // Admin: retourner TOUTES les demandes en attente
        let query = `
          SELECT
            lr.*,
            'leave' as request_type,
            lt.name as request_subtype,
            e.first_name || ' ' || e.last_name as employee_name,
            e.employee_number,
            e.position,
            lt.name as leave_type_name,
            lt.requires_justification,
            lr.days_requested as duration_days
          FROM hr_leave_requests lr
          JOIN hr_employees e ON e.id = lr.employee_id
          LEFT JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
          WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (status) {
          query += ` AND lr.status = $${paramCount}`;
          params.push(status);
          paramCount++;
        }

        if (type) {
          query += ` AND lr.leave_type_id = $${paramCount}`;
          params.push(type);
          paramCount++;
        }

        query += ' ORDER BY lr.created_at DESC';

        const result = await pool.query(query, params);
        return res.json({ success: true, requests: result.rows });
      }

      // Non-admin: logique existante (équipe seulement)
      const teamMembers = await getTeamMemberIds(userId);
      if (teamMembers.length === 0) {
        return res.json({ success: true, requests: [] });
      }

      const employeeIds = teamMembers.map(t => t.id);

      let query = `
        SELECT
          lr.*,
          'leave' as request_type,
          lt.name as request_subtype,
          e.first_name || ' ' || e.last_name as employee_name,
          e.employee_number,
          e.position,
          lt.name as leave_type_name,
          lt.requires_justification,
          lr.days_requested as duration_days
        FROM hr_leave_requests lr
        JOIN hr_employees e ON e.id = lr.employee_id
        LEFT JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.employee_id = ANY($1::uuid[])
      `;
      const params = [employeeIds];
      let paramCount = 2;

      if (status) {
        query += ` AND lr.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      if (type) {
        query += ` AND lr.leave_type_id = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      query += ' ORDER BY lr.created_at DESC';

      const result = await pool.query(query, params);
      res.json({ success: true, requests: result.rows });
    } catch (error) {
      console.error('Error fetching team requests:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Get team overtime requests pending my approval
 */
router.get('/team-overtime',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;
    const { status = 'pending' } = req.query;

    try {
      // Check if hr_overtime_requests table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'hr_overtime_requests'
        )
      `);

      if (!tableExists.rows[0].exists) {
        return res.json({ success: true, requests: [], message: 'Overtime requests table not found' });
      }

      // 🔧 FIX: Admin voit toutes les demandes d'heures sup
      const isAdmin = req.user.role === 'admin';

      if (isAdmin) {
        let query = `
          SELECT
            ot.*,
            'overtime' as request_type,
            e.first_name || ' ' || e.last_name as employee_name,
            e.employee_number,
            e.position,
            ot.estimated_hours as duration_hours
          FROM hr_overtime_requests ot
          JOIN hr_employees e ON e.id = ot.employee_id
          WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (status) {
          query += ` AND ot.status = $${paramCount}`;
          params.push(status);
          paramCount++;
        }

        query += ' ORDER BY ot.created_at DESC';

        const result = await pool.query(query, params);
        return res.json({ success: true, requests: result.rows });
      }

      // Non-admin: logique existante (équipe seulement)
      const teamMembers = await getTeamMemberIds(userId);
      if (teamMembers.length === 0) {
        return res.json({ success: true, requests: [] });
      }

      const employeeIds = teamMembers.map(t => t.id);

      let query = `
        SELECT
          ot.*,
          'overtime' as request_type,
          e.first_name || ' ' || e.last_name as employee_name,
          e.employee_number,
          e.position,
          ot.estimated_hours as duration_hours
        FROM hr_overtime_requests ot
        JOIN hr_employees e ON e.id = ot.employee_id
        WHERE ot.employee_id = ANY($1::uuid[])
      `;
      const params = [employeeIds];
      let paramCount = 2;

      if (status) {
        query += ` AND ot.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      query += ' ORDER BY ot.created_at DESC';

      const result = await pool.query(query, params);
      res.json({ success: true, requests: result.rows });
    } catch (error) {
      console.error('Error fetching team overtime:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Get team leave calendar (approved leaves)
 */
router.get('/team-calendar',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    try {
      const teamMembers = await getTeamMemberIds(userId);
      if (teamMembers.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const employeeIds = teamMembers.map(t => t.id);

      let query = `
        SELECT
          lr.id,
          lr.employee_id,
          e.first_name || ' ' || e.last_name as employee_name,
          lr.start_date,
          lr.end_date,
          lr.days_requested,
          lr.status,
          lt.name as leave_type_name,
          lt.color as leave_type_color
        FROM hr_leave_requests lr
        JOIN hr_employees e ON e.id = lr.employee_id
        LEFT JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.employee_id = ANY($1::uuid[])
        AND lr.status IN ('approved', 'pending')
      `;
      const params = [employeeIds];
      let paramCount = 2;

      if (start_date) {
        query += ` AND lr.end_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }

      if (end_date) {
        query += ` AND lr.start_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }

      query += ' ORDER BY lr.start_date';

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching team calendar:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Get team statistics for current month
 */
router.get('/team-stats',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;

    try {
      const stats = await pool.query(`
        WITH team AS (
          SELECT e.id
          FROM hr_employees e
          WHERE e.manager_id = (SELECT id FROM hr_employees WHERE profile_id = $1)
          AND e.employment_status = 'active'
        ),
        today_present AS (
          SELECT COUNT(DISTINCT employee_id) as count
          FROM hr_attendance_records
          WHERE employee_id IN (SELECT id FROM team)
          AND DATE(clock_time) = CURRENT_DATE
          AND status IN ('check_in', 'late', 'weekend')
        ),
        today_on_leave AS (
          SELECT COUNT(DISTINCT employee_id) as count
          FROM hr_leave_requests
          WHERE employee_id IN (SELECT id FROM team)
          AND status = 'approved'
          AND CURRENT_DATE BETWEEN start_date AND end_date
        ),
        month_late AS (
          SELECT COUNT(*) as count
          FROM hr_attendance_records
          WHERE employee_id IN (SELECT id FROM team)
          AND DATE(clock_time) >= DATE_TRUNC('month', CURRENT_DATE)
          AND late_minutes > 0
        ),
        pending_requests AS (
          SELECT COUNT(*) as count
          FROM hr_leave_requests
          WHERE employee_id IN (SELECT id FROM team)
          AND status = 'pending'
        )
        SELECT
          (SELECT COUNT(*) FROM team) as total_members,
          (SELECT count FROM today_present) as present_today,
          (SELECT count FROM today_on_leave) as on_leave_today,
          (SELECT count FROM month_late) as late_count_month,
          (SELECT count FROM pending_requests) as pending_requests
      `, [userId]);

      // Calculate attendance rate
      const row = stats.rows[0] || { total_members: 0, present_today: 0, on_leave_today: 0, late_count_month: 0, pending_requests: 0 };
      const totalMembers = parseInt(row.total_members) || 0;
      const presentToday = parseInt(row.present_today) || 0;
      const attendanceRate = totalMembers > 0 ? Math.round((presentToday / totalMembers) * 100) : 0;

      res.json({
        success: true,
        stats: {
          total_members: totalMembers,
          present_today: presentToday,
          on_leave_today: parseInt(row.on_leave_today) || 0,
          late_count_month: parseInt(row.late_count_month) || 0,
          pending_requests: parseInt(row.pending_requests) || 0,
          attendance_rate: attendanceRate
        }
      });
    } catch (error) {
      console.error('Error fetching team stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Approve a leave request (as manager)
 * Uses ApprovalService for multi-level approval chain
 */
router.post('/requests/:id/approve',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { comment, request_type = 'leave' } = req.body;

    const approvalService = new ApprovalService(pool);

    try {
      // Use the unified ApprovalService
      const result = await approvalService.approve(
        request_type === 'overtime' ? REQUEST_TYPES.OVERTIME :
        request_type === 'correction' ? REQUEST_TYPES.CORRECTION :
        REQUEST_TYPES.LEAVE,
        id,
        userId,
        comment || ''
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.request,
        message: result.message,
        is_final: result.is_final,
        next_level: result.next_level
      });
    } catch (error) {
      console.error('Error approving request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Reject a leave request (as manager)
 * Uses ApprovalService for consistent rejection handling
 */
router.post('/requests/:id/reject',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { comment, request_type = 'leave' } = req.body;

    const approvalService = new ApprovalService(pool);

    try {
      // Use the unified ApprovalService
      const result = await approvalService.rejectRequest(
        request_type === 'overtime' ? REQUEST_TYPES.OVERTIME :
        request_type === 'correction' ? REQUEST_TYPES.CORRECTION :
        REQUEST_TYPES.LEAVE,
        id,
        userId,
        comment
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        data: result.request,
        message: result.message
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
