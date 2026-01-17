/**
 * System Clock Service
 * Provides a configurable system time independent from server time
 * Used for attendance/clocking operations
 */

/**
 * Parse datetime string without timezone conversion
 * Treats the datetime as UTC to avoid local timezone offset issues
 * @param {string} datetimeStr - Datetime string like "2026-01-17T16:42:00"
 * @returns {Date} Date object with the exact time values
 */
function parseDatetimeAsUTC(datetimeStr) {
  const match = datetimeStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    return new Date(datetimeStr);
  }
  return new Date(Date.UTC(
    parseInt(match[1]),      // year
    parseInt(match[2]) - 1,  // month (0-indexed)
    parseInt(match[3]),      // day
    parseInt(match[4]),      // hour
    parseInt(match[5]),      // minute
    0                        // second
  ));
}

/**
 * Get the current system time
 * If custom clock is enabled, returns adjusted time based on configured offset
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
    if (!config?.enabled || !config.custom_datetime || !config.server_ref_datetime) {
      const result = await pool.query('SELECT NOW() as now');
      return result.rows[0].now;
    }

    // Calculate offset between custom time and server reference time
    // Use parseDatetimeAsUTC to avoid timezone conversion issues
    const customTime = parseDatetimeAsUTC(config.custom_datetime);
    const serverRef = new Date(config.server_ref_datetime);
    const offsetMs = customTime.getTime() - serverRef.getTime();

    // Get current server time and apply offset
    const result = await pool.query('SELECT NOW() as now');
    const serverNow = new Date(result.rows[0].now);

    const adjustedTime = new Date(serverNow.getTime() + offsetMs);

    console.log(`[SYSTEM-CLOCK] Custom clock active: Server=${serverNow.toISOString()}, Adjusted=${adjustedTime.toISOString()}, Offset=${Math.round(offsetMs/60000)}min`);

    return adjustedTime;
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
  return systemTime.toISOString().split('T')[0];
}

/**
 * Get system time as PostgreSQL timestamp string
 *
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<string>} ISO timestamp string
 */
export async function getSystemTimestamp(pool) {
  const systemTime = await getSystemTime(pool);
  return systemTime.toISOString();
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
      custom_datetime: null,
      server_ref_datetime: null,
      updated_at: null,
      updated_by: null
    };

    // Add current server time for display
    const serverNow = await pool.query('SELECT NOW() as now');
    config.current_server_time = serverNow.rows[0].now;

    // Calculate current offset if enabled
    if (config.enabled && config.custom_datetime && config.server_ref_datetime) {
      // Use parseDatetimeAsUTC to avoid timezone conversion issues
      const customTime = parseDatetimeAsUTC(config.custom_datetime);
      const serverRef = new Date(config.server_ref_datetime);
      config.offset_minutes = Math.round((customTime.getTime() - serverRef.getTime()) / 60000);

      // Calculate what the current system time would be
      const currentServerTime = new Date(serverNow.rows[0].now);
      config.current_system_time = new Date(currentServerTime.getTime() + (config.offset_minutes * 60000));
    }

    return config;
  } catch (error) {
    console.error('[SYSTEM-CLOCK] Error getting config:', error);
    return {
      enabled: false,
      custom_datetime: null,
      server_ref_datetime: null,
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
 * @param {string|null} customDatetime - The custom datetime to set (ISO string)
 * @param {string} userId - The user making the change
 * @returns {Promise<Object>} The updated configuration
 */
export async function updateSystemClockConfig(pool, enabled, customDatetime, userId) {
  try {
    // Get current server time as reference
    const serverNow = await pool.query('SELECT NOW() as now');
    const serverRefDatetime = serverNow.rows[0].now;

    const config = {
      enabled: enabled,
      custom_datetime: enabled ? customDatetime : null,
      server_ref_datetime: enabled ? serverRefDatetime : null,
      updated_at: serverRefDatetime,
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

    console.log(`[SYSTEM-CLOCK] Configuration updated by user ${userId}: enabled=${enabled}, datetime=${customDatetime}`);

    return await getSystemClockConfig(pool);
  } catch (error) {
    console.error('[SYSTEM-CLOCK] Error updating config:', error);
    throw error;
  }
}
