/**
 * Service d'horloge système configurable
 *
 * L'admin définit l'heure souhaitée via l'interface "Gestion des Horaires" → "Horloge Système".
 * Le système calcule l'offset et l'applique à TOUTES les opérations de pointage.
 *
 * Principe: Admin configure l'horloge → Système l'utilise partout → Pas de dépendance timezone externe
 */

/**
 * Récupère la configuration de l'horloge depuis hr_settings
 * @param {Pool} pool - Connection pool PostgreSQL
 * @returns {Promise<{enabled: boolean, offset_minutes: number, updated_at?: string, updated_by?: string}>}
 */
export async function getClockConfig(pool) {
  try {
    const result = await pool.query(`
      SELECT setting_value FROM hr_settings WHERE setting_key = 'system_clock'
    `);

    if (result.rows.length === 0) {
      return { enabled: false, offset_minutes: 0 };
    }

    const config = JSON.parse(result.rows[0].setting_value);
    return {
      enabled: config.enabled || false,
      offset_minutes: parseInt(config.offset_minutes) || 0,
      updated_at: config.updated_at || null,
      updated_by: config.updated_by || null
    };
  } catch (error) {
    console.error('[SystemClock] Error getting config:', error.message);
    return { enabled: false, offset_minutes: 0 };
  }
}

/**
 * FONCTION PRINCIPALE: Obtient l'heure système actuelle
 *
 * Si l'horloge est activée: applique l'offset à NOW() PostgreSQL
 * Sinon: retourne l'heure PostgreSQL standard
 *
 * @param {Pool} pool - Connection pool PostgreSQL
 * @returns {Promise<Date>} L'heure système à utiliser pour le pointage
 */
export async function getSystemTime(pool) {
  const config = await getClockConfig(pool);

  if (!config.enabled || config.offset_minutes === 0) {
    // Horloge désactivée: utiliser NOW() PostgreSQL directement
    const result = await pool.query(`SELECT NOW() as now`);
    return new Date(result.rows[0].now);
  }

  // Horloge activée: appliquer l'offset
  // Utilisation de paramètre préparé pour éviter injection SQL
  const offsetMinutes = parseInt(config.offset_minutes);
  const result = await pool.query(`
    SELECT NOW() + ($1 || ' minutes')::INTERVAL as now
  `, [offsetMinutes]);

  return new Date(result.rows[0].now);
}

/**
 * Obtient la date système actuelle au format YYYY-MM-DD
 * Utilisé pour déterminer la date de travail (work_date)
 *
 * @param {Pool} pool - Connection pool PostgreSQL
 * @returns {Promise<string>} Date au format YYYY-MM-DD
 */
export async function getSystemDate(pool) {
  const systemTime = await getSystemTime(pool);
  return systemTime.toISOString().split('T')[0];
}

/**
 * Obtient l'heure système actuelle au format HH:MM
 * Utilisé pour l'affichage dans l'interface
 *
 * @param {Pool} pool - Connection pool PostgreSQL
 * @returns {Promise<string>} Heure au format HH:MM
 */
export async function getSystemTimeFormatted(pool) {
  const systemTime = await getSystemTime(pool);
  return systemTime.toISOString().substring(11, 16);
}

/**
 * Obtient un timestamp ISO complet pour le pointage
 * Format: YYYY-MM-DDTHH:MM:SS+00:00 (forcé en UTC pour cohérence)
 *
 * @param {Pool} pool - Connection pool PostgreSQL
 * @returns {Promise<string>} Timestamp ISO complet
 */
export async function getSystemTimestamp(pool) {
  const config = await getClockConfig(pool);

  if (!config.enabled || config.offset_minutes === 0) {
    // Horloge désactivée: retourner timestamp UTC standard
    const result = await pool.query(`
      SELECT TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"+00:00"') as ts
    `);
    return result.rows[0].ts;
  }

  // Horloge activée: appliquer l'offset et forcer UTC
  const offsetMinutes = parseInt(config.offset_minutes);
  const result = await pool.query(`
    SELECT TO_CHAR((NOW() + ($1 || ' minutes')::INTERVAL) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"+00:00"') as ts
  `, [offsetMinutes]);

  return result.rows[0].ts;
}

/**
 * Met à jour la configuration de l'horloge
 *
 * @param {Pool} pool - Connection pool PostgreSQL
 * @param {boolean} enabled - Activer/désactiver l'horloge personnalisée
 * @param {number} offset_minutes - Décalage en minutes (positif ou négatif)
 * @param {string} updatedBy - ID de l'utilisateur qui fait la modification
 * @returns {Promise<Object>} La nouvelle configuration
 */
export async function updateClockConfig(pool, enabled, offset_minutes, updatedBy) {
  const config = {
    enabled: Boolean(enabled),
    offset_minutes: parseInt(offset_minutes) || 0,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy
  };

  // Upsert: créer si n'existe pas, sinon mettre à jour
  await pool.query(`
    INSERT INTO hr_settings (setting_key, setting_value, description, updated_at)
    VALUES ('system_clock', $1, 'Configuration de l''horloge système pour le pointage', NOW())
    ON CONFLICT (setting_key) DO UPDATE SET
      setting_value = $1,
      updated_at = NOW()
  `, [JSON.stringify(config)]);

  console.log(`[SystemClock] Config updated: enabled=${config.enabled}, offset=${config.offset_minutes}min, by=${updatedBy}`);

  return config;
}

/**
 * Réinitialise l'horloge (désactive l'offset)
 *
 * @param {Pool} pool - Connection pool PostgreSQL
 * @param {string} updatedBy - ID de l'utilisateur qui fait la modification
 * @returns {Promise<Object>} La nouvelle configuration (enabled=false, offset=0)
 */
export async function resetClock(pool, updatedBy) {
  return updateClockConfig(pool, false, 0, updatedBy);
}

/**
 * Vérifie si l'horloge personnalisée est activée
 *
 * @param {Pool} pool - Connection pool PostgreSQL
 * @returns {Promise<boolean>}
 */
export async function isClockEnabled(pool) {
  const config = await getClockConfig(pool);
  return config.enabled && config.offset_minutes !== 0;
}

export default {
  getClockConfig,
  getSystemTime,
  getSystemDate,
  getSystemTimeFormatted,
  getSystemTimestamp,
  updateClockConfig,
  resetClock,
  isClockEnabled
};
