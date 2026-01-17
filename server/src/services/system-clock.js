/**
 * System Clock Service
 * Provides a configurable system time independent from server time
 * Used for attendance/clocking operations
 *
 * NEW APPROACH: Store offset_minutes directly to avoid timezone issues
 */

/**
 * Get the current system time
 * If custom clock is enabled, returns NOW() + offset_minutes
 * Otherwise returns server NOW()
 *
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<Date>} The system time to use for attendance records
 */
export async function getSystemTime(pool) {
  try {
    // Get the system clock configuration
    const settings = await pool.query(`
      SELECT setting_value FROM hr_settings
      WHERE setting_key = 'system_clock'
    `);

    const config = settings.rows[0]?.setting_value;

    // If not configured or disabled, use server time
    if (!config?.enabled) {
      const result = await pool.query('SELECT NOW() as now');
      return result.rows[0].now;
    }

    // Use offset_minutes if available (new approach)
    if (config.offset_minutes !== undefined && config.offset_minutes !== null) {
      const result = await pool.query(
        `SELECT NOW() + INTERVAL '${parseInt(config.offset_minutes)} minutes' as now`
      );
      console.log(`[SYSTEM-CLOCK] Using offset: ${config.offset_minutes} minutes`);
      return result.rows[0].now;
    }

    // Fallback to server time
    const result = await pool.query('SELECT NOW() as now');
    return result.rows[0].now;
  } catch (error) {
    console.error('[SYSTEM-CLOCK] Error getting system time:', error);
    // Fallback to server time on error
    const result = await pool.query('SELECT NOW() as now');
    return result.rows[0].now;
  }
}

/**
 * Get the current system date (for attendance_date)
 * Returns YYYY-MM-DD string
 *
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<string>} The system date in YYYY-MM-DD format
 */
export async function getSystemDate(pool) {
  const systemTime = await getSystemTime(pool);
  // Handle both Date objects and PostgreSQL timestamp strings
  if (systemTime instanceof Date) {
    return systemTime.toISOString().split('T')[0];
  }
  return new Date(systemTime).toISOString().split('T')[0];
}

/**
 * Get system time as PostgreSQL timestamp string
 *
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<string>} ISO timestamp string
 */
export async function getSystemTimestamp(pool) {
  const systemTime = await getSystemTime(pool);
  if (systemTime instanceof Date) {
    return systemTime.toISOString();
  }
  return new Date(systemTime).toISOString();
}

/**
 * Check if custom system clock is enabled
 *
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<boolean>}
 */
export async function isSystemClockEnabled(pool) {
  try {
    const settings = await pool.query(`
      SELECT setting_value FROM hr_settings
      WHERE setting_key = 'system_clock'
    `);
    return settings.rows[0]?.setting_value?.enabled === true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the current clock configuration
 *
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<Object>} The system clock configuration
 */
export async function getSystemClockConfig(pool) {
  try {
    const settings = await pool.query(`
      SELECT setting_value FROM hr_settings
      WHERE setting_key = 'system_clock'
    `);

    const config = settings.rows[0]?.setting_value || {
      enabled: false,
      offset_minutes: 0,
      updated_at: null,
      updated_by: null
    };

    // Add current server time for display
    const serverNow = await pool.query('SELECT NOW() as now');
    config.current_server_time = serverNow.rows[0].now;

    // Calculate current system time if enabled
    if (config.enabled && config.offset_minutes !== undefined) {
      const systemTimeResult = await pool.query(
        `SELECT NOW() + INTERVAL '${parseInt(config.offset_minutes || 0)} minutes' as now`
      );
      config.current_system_time = systemTimeResult.rows[0].now;
    }

    return config;
  } catch (error) {
    console.error('[SYSTEM-CLOCK] Error getting config:', error);
    return {
      enabled: false,
      offset_minutes: 0,
      updated_at: null,
      updated_by: null,
      error: error.message
    };
  }
}

/**
 * Update the system clock configuration
 *
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {boolean} enabled - Whether to enable custom clock
 * @param {number} offsetMinutes - The offset in minutes to apply to server time
 * @param {string} userId - The user making the change
 * @returns {Promise<Object>} The updated configuration
 */
export async function updateSystemClockConfig(pool, enabled, offsetMinutes, userId) {
  try {
    // Get current server time for updated_at
    const serverNow = await pool.query('SELECT NOW() as now');

    const config = {
      enabled: enabled,
      offset_minutes: enabled ? (offsetMinutes || 0) : 0,
      updated_at: serverNow.rows[0].now,
      updated_by: userId
    };

    // Check if setting exists
    const existing = await pool.query(`
      SELECT id FROM hr_settings WHERE setting_key = 'system_clock'
    `);

    if (existing.rows.length === 0) {
      // Insert new setting
      await pool.query(`
        INSERT INTO hr_settings (setting_key, setting_value)
        VALUES ('system_clock', $1)
      `, [JSON.stringify(config)]);
    } else {
      // Update existing setting
      await pool.query(`
        UPDATE hr_settings
        SET setting_value = $1
        WHERE setting_key = 'system_clock'
      `, [JSON.stringify(config)]);
    }

    console.log(`[SYSTEM-CLOCK] Configuration updated by user ${userId}: enabled=${enabled}, offset_minutes=${offsetMinutes}`);

    return await getSystemClockConfig(pool);
  } catch (error) {
    console.error('[SYSTEM-CLOCK] Error updating config:', error);
    throw error;
  }
}
