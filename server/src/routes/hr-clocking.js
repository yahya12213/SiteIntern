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
    SELECT id, first_name, last_name, requires_clocking, employee_number
    FROM hr_employees
    WHERE profile_id = $1
  `, [profileId]);
  return result.rows[0];
};

// Helper: Check if user has clocking permission
const userHasClockingPermission = async (pool, profileId) => {
  const result = await pool.query(`
    SELECT 1 FROM profiles p
    INNER JOIN user_roles ur ON p.id = ur.user_id
    INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
    INNER JOIN permissions perm ON rp.permission_id = perm.id
    WHERE p.id = $1 AND perm.code = 'hr.employee_portal.clock_in_out'
    LIMIT 1
  `, [profileId]);
  return result.rows.length > 0;
};

// Helper: Auto-create employee record for user with clocking permission
const autoCreateEmployeeRecord = async (pool, profileId) => {
  // Get user info (profiles table only has: id, username, password, full_name, role, created_at)
  const userResult = await pool.query(`
    SELECT id, username, full_name
    FROM profiles
    WHERE id = $1
  `, [profileId]);

  if (userResult.rows.length === 0) return null;

  const user = userResult.rows[0];

  // Parse full_name into first_name and last_name
  const nameParts = (user.full_name || user.username || '').trim().split(' ');
  const firstName = nameParts[0] || user.username;
  const lastName = nameParts.slice(1).join(' ') || '';

  // Generate employee number
  const employeeNumber = `EMP-${user.username.toUpperCase().substring(0, 5)}-${Date.now().toString().slice(-4)}`;

  // Create employee record (no email since profiles table doesn't have it)
  const result = await pool.query(`
    INSERT INTO hr_employees (
      employee_number,
      first_name,
      last_name,
      profile_id,
      requires_clocking,
      employment_status,
      hire_date,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, true, 'active', CURRENT_DATE, NOW(), NOW())
    RETURNING id, first_name, last_name, requires_clocking, employee_number
  `, [
    employeeNumber,
    firstName,
    lastName,
    profileId
  ]);

  console.log(`✅ Auto-created employee record for ${user.username}: ${employeeNumber}`);
  return result.rows[0];
};

// Helper: Get or create employee for user with permission
const getOrCreateEmployeeByProfileId = async (pool, profileId) => {
  // First try to get existing employee
  let employee = await getEmployeeByProfileId(pool, profileId);

  if (employee) return employee;

  // Check if user has clocking permission
  const hasPermission = await userHasClockingPermission(pool, profileId);

  if (hasPermission) {
    // Auto-create employee record
    employee = await autoCreateEmployeeRecord(pool, profileId);
  }

  return employee;
};

// Helper: Get break rules from settings
const getBreakRules = async (pool) => {
  const result = await pool.query(`
    SELECT setting_value
    FROM hr_settings
    WHERE setting_key = 'break_rules'
  `);

  if (result.rows.length === 0) {
    // Default break rules
    return {
      default_break_minutes: 60,
      deduct_break_automatically: true
    };
  }

  return result.rows[0].setting_value;
};

// Helper: Calculate worked minutes for a day
const calculateWorkedMinutes = (records, breakRules) => {
  if (records.length === 0) return 0;
  if (records.length % 2 !== 0) return null; // Incomplete (odd number of records)

  let totalMinutes = 0;

  // Process pairs: check_in -> check_out
  for (let i = 0; i < records.length; i += 2) {
    const checkIn = new Date(records[i].clock_time);
    const checkOut = new Date(records[i + 1].clock_time);
    const minutes = Math.floor((checkOut - checkIn) / 1000 / 60);
    totalMinutes += minutes;
  }

  // Deduct break time if enabled
  if (breakRules.deduct_break_automatically) {
    totalMinutes -= breakRules.default_break_minutes || 0;
    totalMinutes = Math.max(0, totalMinutes); // Don't go negative
  }

  return totalMinutes;
};

// POST /api/hr/clocking/check-in - Clock in
router.post('/check-in', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const employee = await getOrCreateEmployeeByProfileId(pool, req.user.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Aucun employé trouvé pour cet utilisateur'
      });
    }

    if (!employee.requires_clocking) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à pointer'
      });
    }

    // Check last action today
    const today = new Date().toISOString().split('T')[0];
    const lastAction = await pool.query(`
      SELECT clock_time, status
      FROM hr_attendance_records
      WHERE employee_id = $1
        AND DATE(clock_time) = $2
      ORDER BY clock_time DESC
      LIMIT 1
    `, [employee.id, today]);

    if (lastAction.rows.length > 0 && lastAction.rows[0].status === 'check_in') {
      return res.status(400).json({
        success: false,
        error: 'Vous avez déjà pointé l\'entrée. Veuillez pointer la sortie.',
        last_action: lastAction.rows[0]
      });
    }

    // Insert check-in record
    const result = await pool.query(`
      INSERT INTO hr_attendance_records (
        employee_id,
        clock_time,
        status,
        source,
        created_at
      ) VALUES ($1, NOW(), 'check_in', 'self_service', NOW())
      RETURNING id, clock_time, status
    `, [employee.id]);

    res.json({
      success: true,
      message: 'Entrée enregistrée avec succès',
      record: result.rows[0]
    });

  } catch (error) {
    console.error('Error in check-in:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'enregistrement de l\'entrée',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// POST /api/hr/clocking/check-out - Clock out
router.post('/check-out', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const employee = await getOrCreateEmployeeByProfileId(pool, req.user.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Aucun employé trouvé pour cet utilisateur'
      });
    }

    if (!employee.requires_clocking) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à pointer'
      });
    }

    // Check last action today
    const today = new Date().toISOString().split('T')[0];
    const lastAction = await pool.query(`
      SELECT clock_time, status
      FROM hr_attendance_records
      WHERE employee_id = $1
        AND DATE(clock_time) = $2
      ORDER BY clock_time DESC
      LIMIT 1
    `, [employee.id, today]);

    if (lastAction.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vous devez d\'abord pointer l\'entrée'
      });
    }

    if (lastAction.rows[0].status === 'check_out') {
      return res.status(400).json({
        success: false,
        error: 'Vous avez déjà pointé la sortie. Veuillez pointer l\'entrée si vous revenez.',
        last_action: lastAction.rows[0]
      });
    }

    // Insert check-out record
    const result = await pool.query(`
      INSERT INTO hr_attendance_records (
        employee_id,
        clock_time,
        status,
        source,
        created_at
      ) VALUES ($1, NOW(), 'check_out', 'self_service', NOW())
      RETURNING id, clock_time, status
    `, [employee.id]);

    // Calculate worked minutes for today
    const todayRecords = await pool.query(`
      SELECT clock_time, status
      FROM hr_attendance_records
      WHERE employee_id = $1
        AND DATE(clock_time) = $2
      ORDER BY clock_time ASC
    `, [employee.id, today]);

    const breakRules = await getBreakRules(pool);
    const workedMinutes = calculateWorkedMinutes(todayRecords.rows, breakRules);

    res.json({
      success: true,
      message: 'Sortie enregistrée avec succès',
      record: result.rows[0],
      worked_minutes_today: workedMinutes
    });

  } catch (error) {
    console.error('Error in check-out:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'enregistrement de la sortie',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// GET /api/hr/clocking/my-today - Get today's status
router.get('/my-today', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const employee = await getOrCreateEmployeeByProfileId(pool, req.user.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Aucun employé trouvé pour cet utilisateur'
      });
    }

    if (!employee.requires_clocking) {
      return res.json({
        success: true,
        requires_clocking: false,
        message: 'Vous n\'avez pas besoin de pointer'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get all records for today
    const records = await pool.query(`
      SELECT id, clock_time, status, source
      FROM hr_attendance_records
      WHERE employee_id = $1
        AND DATE(clock_time) = $2
      ORDER BY clock_time ASC
    `, [employee.id, today]);

    // Get last action
    const lastAction = records.rows.length > 0 ? records.rows[records.rows.length - 1] : null;

    // Calculate worked minutes
    const breakRules = await getBreakRules(pool);
    const workedMinutes = calculateWorkedMinutes(records.rows, breakRules);

    res.json({
      success: true,
      requires_clocking: true,
      employee: {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`
      },
      today: {
        date: today,
        records: records.rows,
        last_action: lastAction,
        can_check_in: !lastAction || lastAction.status === 'check_out',
        can_check_out: lastAction && lastAction.status === 'check_in',
        worked_minutes: workedMinutes,
        is_complete: records.rows.length % 2 === 0
      }
    });

  } catch (error) {
    console.error('Error in my-today:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du statut',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

// GET /api/hr/clocking/my-records - Get full history
router.get('/my-records', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const { start_date, end_date, limit = 100, offset = 0 } = req.query;

    const employee = await getOrCreateEmployeeByProfileId(pool, req.user.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Aucun employé trouvé pour cet utilisateur'
      });
    }

    if (!employee.requires_clocking) {
      return res.json({
        success: true,
        requires_clocking: false,
        records: []
      });
    }

    // Build query with optional date filters
    let query = `
      SELECT
        DATE(clock_time) as date,
        array_agg(
          json_build_object(
            'id', id,
            'clock_time', clock_time,
            'status', status,
            'source', source
          ) ORDER BY clock_time ASC
        ) as records
      FROM hr_attendance_records
      WHERE employee_id = $1
    `;

    const params = [employee.id];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND DATE(clock_time) >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND DATE(clock_time) <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += `
      GROUP BY DATE(clock_time)
      ORDER BY DATE(clock_time) DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get break rules
    const breakRules = await getBreakRules(pool);

    // Calculate worked minutes for each day
    const recordsWithCalculations = result.rows.map(day => {
      const workedMinutes = calculateWorkedMinutes(day.records, breakRules);
      return {
        date: day.date,
        records: day.records,
        worked_minutes: workedMinutes,
        is_complete: day.records.length % 2 === 0,
        has_anomaly: day.records.length % 2 !== 0
      };
    });

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT DATE(clock_time)) as total
      FROM hr_attendance_records
      WHERE employee_id = $1
      ${start_date ? `AND DATE(clock_time) >= $2` : ''}
      ${end_date ? `AND DATE(clock_time) <= $${start_date ? '3' : '2'}` : ''}
    `, start_date && end_date ? [employee.id, start_date, end_date] : start_date ? [employee.id, start_date] : end_date ? [employee.id, end_date] : [employee.id]);

    res.json({
      success: true,
      employee: {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`
      },
      records: recordsWithCalculations,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error in my-records:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
      details: error.message
    });
  } finally {
    await pool.end();
  }
});

export default router;
