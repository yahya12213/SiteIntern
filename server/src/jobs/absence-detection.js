import pg from 'pg';
import cron from 'node-cron';

const { Pool } = pg;

const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper: Check if date is a public holiday
const isPublicHoliday = async (pool, date) => {
  const result = await pool.query(`
    SELECT id FROM hr_public_holidays
    WHERE holiday_date = $1
    LIMIT 1
  `, [date]);
  return result.rows.length > 0;
};

// Helper: Check if date is a recovery day off for an employee
const isRecoveryDayOff = async (pool, employeeId, date) => {
  const empResult = await pool.query(`
    SELECT department, segment_id, centre_id
    FROM hr_employees
    WHERE id = $1
  `, [employeeId]);

  if (empResult.rows.length === 0) return false;
  const emp = empResult.rows[0];

  const result = await pool.query(`
    SELECT rd.id
    FROM hr_recovery_declarations rd
    JOIN hr_recovery_periods rp ON rd.recovery_period_id = rp.id
    WHERE rd.recovery_date = $1
      AND rd.is_day_off = true
      AND rd.status = 'active'
      AND rp.status = 'active'
      AND (
        rp.applies_to_all = true
        OR rd.department_id = $2
        OR rd.segment_id = $3
        OR rd.centre_id = $4
      )
    LIMIT 1
  `, [date, emp.department, emp.segment_id, emp.centre_id]);

  return result.rows.length > 0;
};

// Helper: Check if date is a working day according to schedule
const getScheduleForDate = async (pool, date) => {
  const result = await pool.query(`
    SELECT working_days
    FROM hr_work_schedules
    WHERE is_active = true
    LIMIT 1
  `);

  if (result.rows.length === 0) return null;

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to ISO day (1-7, Monday = 1)

  return result.rows[0].working_days?.includes(isoDay);
};

/**
 * Detect and mark employees as absent if they have no attendance records
 * Runs daily at 20:01 to check the previous day
 */
export const detectAbsences = async () => {
  const pool = getPool();

  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`[ABSENCE DETECTION] Checking ${yesterdayStr}...`);

    // Check if yesterday was a public holiday
    if (await isPublicHoliday(pool, yesterdayStr)) {
      console.log(`[ABSENCE DETECTION] ${yesterdayStr} is a public holiday - skipping`);
      return;
    }

    // Check if yesterday was a working day
    const isWorkingDay = await getScheduleForDate(pool, yesterdayStr);
    if (!isWorkingDay) {
      console.log(`[ABSENCE DETECTION] ${yesterdayStr} is not a working day - skipping`);
      return;
    }

    // Get all active employees who require clocking
    const employees = await pool.query(`
      SELECT id, employee_number, first_name, last_name
      FROM hr_employees
      WHERE employment_status = 'active' AND requires_clocking = true
    `);

    console.log(`[ABSENCE DETECTION] Checking ${employees.rows.length} employees...`);

    let absenceCount = 0;

    for (const employee of employees.rows) {
      // Skip if employee has a recovery day off
      if (await isRecoveryDayOff(pool, employee.id, yesterdayStr)) {
        continue;
      }

      // Check if employee has ANY attendance record for yesterday
      const attendance = await pool.query(`
        SELECT id
        FROM hr_attendance_records
        WHERE employee_id = $1
          AND DATE(clock_time) = $2
        LIMIT 1
      `, [employee.id, yesterdayStr]);

      // If no record exists, mark as absent
      if (attendance.rows.length === 0) {
        await pool.query(`
          INSERT INTO hr_attendance_records (
            employee_id,
            attendance_date,
            clock_time,
            status,
            source,
            notes,
            is_anomaly,
            anomaly_type,
            created_at
          ) VALUES (
            $1,
            $2,
            $2::timestamp,
            'absent',
            'system',
            'Détecté automatiquement - aucun pointage',
            true,
            'missing_record',
            NOW()
          )
        `, [employee.id, yesterdayStr]);

        console.log(`  → ABSENT: ${employee.first_name} ${employee.last_name} (${employee.employee_number})`);
        absenceCount++;
      }
    }

    console.log(`[ABSENCE DETECTION] Complete - ${absenceCount} absences recorded`);
  } catch (error) {
    console.error('[ABSENCE DETECTION] Error:', error);
  } finally {
    await pool.end();
  }
};

/**
 * Start the absence detection cron job
 * Runs every day at 20:01 (Africa/Casablanca timezone)
 */
export const startAbsenceDetectionJob = () => {
  // Schedule: Run at 20:01 every day
  cron.schedule('1 20 * * *', async () => {
    console.log('[CRON] Running absence detection...');
    await detectAbsences();
  }, {
    scheduled: true,
    timezone: "Africa/Casablanca"
  });

  console.log('[CRON] Absence detection scheduled: daily at 20:01 (Africa/Casablanca)');
};
