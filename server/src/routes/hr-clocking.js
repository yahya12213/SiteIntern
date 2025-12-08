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
  try {
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
  } catch (error) {
    // Table hr_settings might not exist yet - return defaults
    console.log('Warning: hr_settings table not found, using default break rules');
    return {
      default_break_minutes: 60,
      deduct_break_automatically: true
    };
  }
};

// Helper: Get active work schedule
const getActiveSchedule = async (pool) => {
  try {
    const result = await pool.query(`
      SELECT
        id, name,
        monday_start, monday_end,
        tuesday_start, tuesday_end,
        wednesday_start, wednesday_end,
        thursday_start, thursday_end,
        friday_start, friday_end,
        saturday_start, saturday_end,
        sunday_start, sunday_end,
        working_days,
        break_duration_minutes,
        tolerance_late_minutes,
        tolerance_early_leave_minutes,
        min_hours_for_half_day
      FROM hr_work_schedules
      WHERE is_active = true
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.warn('No active work schedule found');
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching active schedule:', error);
    return null;
  }
};

// Helper: Get scheduled times for a specific date
const getScheduledTimesForDate = (schedule, date) => {
  if (!schedule) return null;

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0=Dimanche, 1=Lundi, ..., 6=Samedi
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 1=Lundi, 7=Dimanche

  const isWorkingDay = schedule.working_days?.includes(isoDay);

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];

  const startTime = schedule[`${dayName}_start`];
  const endTime = schedule[`${dayName}_end`];

  if (!startTime || !endTime) {
    return { isWorkingDay: false, scheduledStart: null, scheduledEnd: null };
  }

  return { isWorkingDay, scheduledStart: startTime, scheduledEnd: endTime };
};

// Helper: Calculate late minutes with tolerance
const calculateLateMinutes = (clockTime, scheduledStart, toleranceMinutes = 0) => {
  if (!scheduledStart) return 0;

  const clockTimeObj = new Date(clockTime);
  const clockTotalMinutes = clockTimeObj.getHours() * 60 + clockTimeObj.getMinutes();

  const [schedHours, schedMinutes] = scheduledStart.split(':').map(Number);
  const schedTotalMinutes = schedHours * 60 + schedMinutes;

  const diffMinutes = clockTotalMinutes - schedTotalMinutes;

  if (diffMinutes <= toleranceMinutes) return 0;

  return Math.max(0, diffMinutes);
};

// Helper: Calculate early leave minutes with tolerance
const calculateEarlyLeaveMinutes = (clockTime, scheduledEnd, toleranceMinutes = 0) => {
  if (!scheduledEnd) return 0;

  const clockTimeObj = new Date(clockTime);
  const clockTotalMinutes = clockTimeObj.getHours() * 60 + clockTimeObj.getMinutes();

  const [schedHours, schedMinutes] = scheduledEnd.split(':').map(Number);
  const schedTotalMinutes = schedHours * 60 + schedMinutes;

  const diffMinutes = schedTotalMinutes - clockTotalMinutes;

  if (diffMinutes <= toleranceMinutes) return 0;

  return Math.max(0, diffMinutes);
};

// Helper: Calculate overtime minutes
const calculateOvertimeMinutes = (clockTime, scheduledEnd) => {
  if (!scheduledEnd) return 0;

  const clockTimeObj = new Date(clockTime);
  const clockTotalMinutes = clockTimeObj.getHours() * 60 + clockTimeObj.getMinutes();

  const [schedHours, schedMinutes] = scheduledEnd.split(':').map(Number);
  const schedTotalMinutes = schedHours * 60 + schedMinutes;

  const diffMinutes = clockTotalMinutes - schedTotalMinutes;

  return Math.max(0, diffMinutes);
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

    // Récupérer l'horaire actif
    const schedule = await getActiveSchedule(pool);
    const scheduledTimes = schedule ? getScheduledTimesForDate(schedule, today) : null;

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

    // Calculer les données d'horaire
    let scheduledStart = null;
    let lateMinutes = 0;
    let initialStatus = 'check_in';

    if (scheduledTimes) {
      if (scheduledTimes.isWorkingDay) {
        scheduledStart = scheduledTimes.scheduledStart;

        lateMinutes = calculateLateMinutes(
          new Date(),
          scheduledStart,
          schedule.tolerance_late_minutes || 0
        );

        if (lateMinutes > 0) {
          initialStatus = 'late';
        }
      } else {
        // Jour non ouvrable (weekend)
        initialStatus = 'weekend';
      }
    }

    // Insert check-in record
    const result = await pool.query(`
      INSERT INTO hr_attendance_records (
        employee_id,
        attendance_date,
        clock_time,
        status,
        source,
        scheduled_start,
        late_minutes,
        created_at
      ) VALUES ($1, CURRENT_DATE, NOW(), $2, 'self_service', $3, $4, NOW())
      RETURNING id, clock_time, status, late_minutes, scheduled_start
    `, [employee.id, initialStatus, scheduledStart, lateMinutes]);

    res.json({
      success: true,
      message: lateMinutes > 0
        ? `Entrée enregistrée (${lateMinutes} min de retard)`
        : 'Entrée enregistrée avec succès',
      record: result.rows[0],
      late_minutes: lateMinutes,
      scheduled_start: scheduledStart
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

    // Récupérer l'horaire actif
    const schedule = await getActiveSchedule(pool);
    const scheduledTimes = schedule ? getScheduledTimesForDate(schedule, today) : null;

    // Récupérer le check-in pour obtenir scheduled_start et late_minutes
    const checkInRecord = await pool.query(`
      SELECT scheduled_start, status, clock_time, late_minutes
      FROM hr_attendance_records
      WHERE employee_id = $1
        AND DATE(clock_time) = $2
        AND status IN ('check_in', 'late', 'weekend')
      ORDER BY clock_time DESC
      LIMIT 1
    `, [employee.id, today]);

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

    const checkIn = checkInRecord.rows[0];
    const scheduledStartFromCheckIn = checkIn?.scheduled_start || null;

    // Calculer les écarts
    let scheduledEnd = null;
    let earlyLeaveMinutes = 0;
    let overtimeMinutes = 0;
    let finalStatus = 'check_out';

    if (scheduledTimes) {
      if (scheduledTimes.isWorkingDay) {
        scheduledEnd = scheduledTimes.scheduledEnd;

        const now = new Date();

        earlyLeaveMinutes = calculateEarlyLeaveMinutes(
          now,
          scheduledEnd,
          schedule.tolerance_early_leave_minutes || 0
        );

        if (earlyLeaveMinutes === 0) {
          overtimeMinutes = calculateOvertimeMinutes(now, scheduledEnd);
        }
      } else {
        finalStatus = 'weekend';
      }
    }

    // Insert check-out record
    const result = await pool.query(`
      INSERT INTO hr_attendance_records (
        employee_id,
        attendance_date,
        clock_time,
        status,
        source,
        scheduled_start,
        scheduled_end,
        early_leave_minutes,
        overtime_minutes,
        created_at
      ) VALUES ($1, CURRENT_DATE, NOW(), $2, 'self_service', $3, $4, $5, $6, NOW())
      RETURNING id, clock_time, status, scheduled_end, early_leave_minutes, overtime_minutes
    `, [employee.id, finalStatus, scheduledStartFromCheckIn, scheduledEnd, earlyLeaveMinutes, overtimeMinutes]);

    // Calculate worked minutes for today
    const todayRecords = await pool.query(`
      SELECT clock_time, status
      FROM hr_attendance_records
      WHERE employee_id = $1
        AND DATE(clock_time) = $2
      ORDER BY clock_time ASC
    `, [employee.id, today]);

    const breakRules = await getBreakRules(pool);
    // Utiliser la pause de l'horaire si disponible
    const breakMinutes = schedule?.break_duration_minutes || breakRules.default_break_minutes || 60;
    const workedMinutes = calculateWorkedMinutes(todayRecords.rows, {
      deduct_break_automatically: true,
      default_break_minutes: breakMinutes
    });

    // Déterminer le statut final de la journée
    let dayStatus = 'present';

    if (checkIn?.status === 'late') {
      dayStatus = 'late';
    }

    if (earlyLeaveMinutes > 0) {
      dayStatus = 'late';
    }

    if (workedMinutes !== null && schedule) {
      const workedHours = workedMinutes / 60;
      if (workedHours < (schedule.min_hours_for_half_day || 4)) {
        dayStatus = 'half_day';
      }
    }

    if (scheduledTimes && !scheduledTimes.isWorkingDay) {
      dayStatus = 'weekend';
    }

    // Mettre à jour le record check-in avec le statut final
    await pool.query(`
      UPDATE hr_attendance_records
      SET status = $1
      WHERE employee_id = $2
        AND DATE(clock_time) = $3
        AND status IN ('check_in', 'late')
    `, [dayStatus, employee.id, today]);

    res.json({
      success: true,
      message: 'Sortie enregistrée avec succès',
      record: result.rows[0],
      worked_minutes_today: workedMinutes,
      summary: {
        scheduled_start: scheduledStartFromCheckIn,
        scheduled_end: scheduledEnd,
        late_minutes: checkIn?.late_minutes || 0,
        early_leave_minutes: earlyLeaveMinutes,
        overtime_minutes: overtimeMinutes,
        break_minutes: breakMinutes,
        day_status: dayStatus
      }
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
    let employee;
    try {
      employee = await getOrCreateEmployeeByProfileId(pool, req.user.id);
    } catch (err) {
      console.error('Error getting employee for my-today:', err.message);
      // Return a default response that allows clocking
      return res.json({
        success: true,
        requires_clocking: true,
        employee: { id: null, name: req.user.fullName || 'Utilisateur' },
        today: {
          date: new Date().toISOString().split('T')[0],
          records: [],
          last_action: null,
          can_check_in: true,
          can_check_out: false,
          worked_minutes: 0,
          is_complete: true
        }
      });
    }

    if (!employee) {
      // Return default that allows clocking
      return res.json({
        success: true,
        requires_clocking: true,
        employee: { id: null, name: req.user.fullName || 'Utilisateur' },
        today: {
          date: new Date().toISOString().split('T')[0],
          records: [],
          last_action: null,
          can_check_in: true,
          can_check_out: false,
          worked_minutes: 0,
          is_complete: true
        }
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

    // Get all records for today (with try/catch for missing table)
    let records = { rows: [] };
    try {
      records = await pool.query(`
        SELECT id, clock_time, status, source
        FROM hr_attendance_records
        WHERE employee_id = $1
          AND DATE(clock_time) = $2
        ORDER BY clock_time ASC
      `, [employee.id, today]);
    } catch (err) {
      console.log('Warning: hr_attendance_records table issue:', err.message);
    }

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
