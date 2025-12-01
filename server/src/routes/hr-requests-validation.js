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

// GET /api/hr/requests-validation/pending - Get pending requests for current approver
router.get('/pending', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const { type } = req.query;
    const userId = req.user.id;

    // Get pending leave requests
    let leaveQuery = `
      SELECT
        lr.id,
        'leave' as request_type,
        lt.code as type_code,
        lt.name as type_name,
        e.id as employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        e.department as employee_department,
        lr.start_date,
        lr.end_date,
        lr.days_requested,
        lr.reason as motif,
        lr.status,
        lr.created_at as date_soumission,
        CASE
          WHEN lr.status = 'pending' THEN 1
          WHEN lr.status = 'approved_n1' THEN 2
          ELSE 1
        END as etape_actuelle,
        CASE
          WHEN lt.requires_n2_approval THEN 2
          ELSE 1
        END as etape_totale,
        lr.n1_approver_id,
        lr.n2_approver_id
      FROM hr_leave_requests lr
      JOIN hr_leave_types lt ON lr.leave_type_id = lt.id
      JOIN hr_employees e ON lr.employee_id = e.id
      WHERE lr.status IN ('pending', 'approved_n1')
      ORDER BY lr.created_at DESC
    `;

    // Get pending overtime requests
    let overtimeQuery = `
      SELECT
        ot.id,
        'overtime' as request_type,
        'heures_sup' as type_code,
        'Heures supplementaires' as type_name,
        e.id as employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        e.department as employee_department,
        ot.request_date as start_date,
        ot.request_date as end_date,
        ot.estimated_hours as days_requested,
        ot.reason as motif,
        ot.status,
        ot.created_at as date_soumission,
        1 as etape_actuelle,
        1 as etape_totale
      FROM hr_overtime_requests ot
      JOIN hr_employees e ON ot.employee_id = e.id
      WHERE ot.status = 'pending'
      ORDER BY ot.created_at DESC
    `;

    const [leaveResults, overtimeResults] = await Promise.all([
      pool.query(leaveQuery),
      pool.query(overtimeQuery)
    ]);

    // Combine and filter by type if specified
    let allRequests = [...leaveResults.rows, ...overtimeResults.rows];

    if (type && type !== 'all') {
      allRequests = allRequests.filter(r => r.type_code === type);
    }

    // Sort by date
    allRequests.sort((a, b) => new Date(b.date_soumission) - new Date(a.date_soumission));

    res.json({
      success: true,
      requests: allRequests,
      count: allRequests.length
    });

  } catch (error) {
    console.error('Error in pending requests:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation des demandes',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// GET /api/hr/requests-validation/history - Get decision history
router.get('/history', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const { limit = 50 } = req.query;

    // Get approved/rejected leave requests
    const leaveHistory = await pool.query(`
      SELECT
        lr.id,
        'leave' as request_type,
        lt.code as type_code,
        lt.name as type_name,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        lr.status as decision,
        lr.created_at as date_soumission,
        COALESCE(lr.n1_approved_at, lr.n2_approved_at, lr.hr_approved_at, lr.updated_at) as date_decision,
        COALESCE(lr.n1_comment, lr.n2_comment, lr.hr_comment) as commentaire
      FROM hr_leave_requests lr
      JOIN hr_leave_types lt ON lr.leave_type_id = lt.id
      JOIN hr_employees e ON lr.employee_id = e.id
      WHERE lr.status IN ('approved', 'rejected')
      ORDER BY lr.updated_at DESC
      LIMIT $1
    `, [parseInt(limit)]);

    // Get approved/rejected overtime requests
    const overtimeHistory = await pool.query(`
      SELECT
        ot.id,
        'overtime' as request_type,
        'heures_sup' as type_code,
        'Heures supplementaires' as type_name,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        ot.status as decision,
        ot.created_at as date_soumission,
        ot.updated_at as date_decision,
        ot.approver_comment as commentaire
      FROM hr_overtime_requests ot
      JOIN hr_employees e ON ot.employee_id = e.id
      WHERE ot.status IN ('approved', 'rejected')
      ORDER BY ot.updated_at DESC
      LIMIT $1
    `, [parseInt(limit)]);

    // Combine and sort
    const allHistory = [...leaveHistory.rows, ...overtimeHistory.rows]
      .sort((a, b) => new Date(b.date_decision) - new Date(a.date_decision))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      history: allHistory
    });

  } catch (error) {
    console.error('Error in history:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation de l\'historique',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// POST /api/hr/requests-validation/:id/approve - Approve a request
router.post('/:id/approve', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const { id } = req.params;
    const { request_type, comment } = req.body;
    const userId = req.user.id;

    if (request_type === 'leave') {
      // Update leave request
      await pool.query(`
        UPDATE hr_leave_requests
        SET
          status = 'approved',
          n1_approver_id = $2,
          n1_approved_at = NOW(),
          n1_comment = $3,
          updated_at = NOW()
        WHERE id = $1
      `, [id, userId, comment || '']);

      // Update leave balance
      const leaveRequest = await pool.query(`
        SELECT employee_id, leave_type_id, days_requested
        FROM hr_leave_requests
        WHERE id = $1
      `, [id]);

      if (leaveRequest.rows.length > 0) {
        const { employee_id, leave_type_id, days_requested } = leaveRequest.rows[0];
        await pool.query(`
          UPDATE hr_leave_balances
          SET taken = taken + $3, updated_at = NOW()
          WHERE employee_id = $1 AND leave_type_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)
        `, [employee_id, leave_type_id, days_requested]);
      }

    } else if (request_type === 'overtime') {
      // Update overtime request
      await pool.query(`
        UPDATE hr_overtime_requests
        SET
          status = 'approved',
          approver_id = $2,
          approved_at = NOW(),
          approver_comment = $3,
          updated_at = NOW()
        WHERE id = $1
      `, [id, userId, comment || '']);
    }

    res.json({
      success: true,
      message: 'Demande approuvee avec succes'
    });

  } catch (error) {
    console.error('Error in approve:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'approbation',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// POST /api/hr/requests-validation/:id/reject - Reject a request
router.post('/:id/reject', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const { id } = req.params;
    const { request_type, comment } = req.body;
    const userId = req.user.id;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Un commentaire est obligatoire pour le rejet'
      });
    }

    if (request_type === 'leave') {
      await pool.query(`
        UPDATE hr_leave_requests
        SET
          status = 'rejected',
          n1_approver_id = $2,
          n1_approved_at = NOW(),
          n1_comment = $3,
          updated_at = NOW()
        WHERE id = $1
      `, [id, userId, comment]);
    } else if (request_type === 'overtime') {
      await pool.query(`
        UPDATE hr_overtime_requests
        SET
          status = 'rejected',
          approver_id = $2,
          approved_at = NOW(),
          approver_comment = $3,
          updated_at = NOW()
        WHERE id = $1
      `, [id, userId, comment]);
    }

    res.json({
      success: true,
      message: 'Demande rejetee'
    });

  } catch (error) {
    console.error('Error in reject:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du rejet',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// GET /api/hr/requests-validation/:id - Get request details
router.get('/:id', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const { id } = req.params;
    const { type } = req.query;

    let result;
    if (type === 'leave') {
      result = await pool.query(`
        SELECT
          lr.*,
          lt.code as type_code,
          lt.name as type_name,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          e.department as employee_department
        FROM hr_leave_requests lr
        JOIN hr_leave_types lt ON lr.leave_type_id = lt.id
        JOIN hr_employees e ON lr.employee_id = e.id
        WHERE lr.id = $1
      `, [id]);
    } else {
      result = await pool.query(`
        SELECT
          ot.*,
          'heures_sup' as type_code,
          'Heures supplementaires' as type_name,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          e.department as employee_department
        FROM hr_overtime_requests ot
        JOIN hr_employees e ON ot.employee_id = e.id
        WHERE ot.id = $1
      `, [id]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Demande non trouvee'
      });
    }

    res.json({
      success: true,
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Error in get request:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

export default router;
