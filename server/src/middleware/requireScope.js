/**
 * Scope-Based Access Control (SBAC) Middleware
 * Enforces data filtering based on user's assigned segments and cities
 * Works alongside RBAC (requirePermission) to ensure users only access their scope
 */

import pool from '../config/database.js';

/**
 * Injects user's scope (segments + cities) into request object
 * Must be used AFTER authenticateToken middleware
 *
 * Sets req.userScope = {
 *   segmentIds: string[],  // Array of segment IDs user can access
 *   cityIds: string[],      // Array of city IDs user can access
 *   isAdmin: boolean,       // If true, user bypasses scope filtering
 *   userId: string          // User ID for logging
 * }
 */
export const injectUserScope = async (req, res, next) => {
  try {
    // If no user, skip scope injection (auth middleware will handle)
    if (!req.user || !req.user.id) {
      req.userScope = {
        segmentIds: [],
        cityIds: [],
        isAdmin: false,
        userId: null
      };
      return next();
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin users bypass all scope filtering
    if (userRole === 'admin') {
      req.userScope = {
        segmentIds: [],
        cityIds: [],
        isAdmin: true,
        userId
      };
      return next();
    }

    // Fetch user's assigned segments
    const segmentsResult = await pool.query(
      'SELECT segment_id FROM professor_segments WHERE professor_id = $1',
      [userId]
    );
    const segmentIds = segmentsResult.rows.map(row => row.segment_id);

    // Fetch user's assigned cities
    const citiesResult = await pool.query(
      'SELECT city_id FROM professor_cities WHERE professor_id = $1',
      [userId]
    );
    const cityIds = citiesResult.rows.map(row => row.city_id);

    req.userScope = {
      segmentIds,
      cityIds,
      isAdmin: false,
      userId
    };

    next();
  } catch (error) {
    console.error('Scope injection error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error loading user scope',
      code: 'SCOPE_INJECTION_ERROR'
    });
  }
};

/**
 * Middleware to enforce scope filtering on database queries
 * Returns SQL WHERE conditions and parameters for scope filtering
 *
 * Usage in routes:
 * const scopeFilter = requireScope(req, 'segment_id', 'city_id');
 * if (scopeFilter.conditions.length > 0) {
 *   query += ' WHERE ' + scopeFilter.conditions.join(' AND ');
 *   params.push(...scopeFilter.params);
 * }
 */
export const buildScopeFilter = (req, segmentColumn = 'segment_id', cityColumn = 'city_id') => {
  const scope = req.userScope;

  // Admin bypasses filtering
  if (!scope || scope.isAdmin) {
    return {
      conditions: [],
      params: [],
      hasScope: false
    };
  }

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Filter by segments if user has assigned segments
  if (scope.segmentIds && scope.segmentIds.length > 0) {
    conditions.push(`${segmentColumn} = ANY($${paramIndex}::text[])`);
    params.push(scope.segmentIds);
    paramIndex++;
  } else {
    // If user has no segments assigned, they can't see any data
    // Use impossible condition to return empty result
    conditions.push('1 = 0');
  }

  // Filter by cities if user has assigned cities
  if (scope.cityIds && scope.cityIds.length > 0) {
    conditions.push(`${cityColumn} = ANY($${paramIndex}::uuid[])`);
    params.push(scope.cityIds);
    paramIndex++;
  } else {
    // If user has no cities assigned, they can't see any data
    conditions.push('1 = 0');
  }

  return {
    conditions,
    params,
    hasScope: true,
    paramIndex // Next available parameter index for additional query params
  };
};

/**
 * Verifies that a specific record is within user's scope
 * Used for UPDATE/DELETE operations to prevent modification outside scope
 *
 * @param {string} table - Table name (e.g., 'professor_declarations')
 * @param {string} recordId - Record ID to check
 * @param {string} segmentColumn - Column name for segment FK
 * @param {string} cityColumn - Column name for city FK
 * @param {object} userScope - req.userScope object
 * @returns {Promise<boolean>} - True if record is in scope, false otherwise
 */
export const verifyRecordInScope = async (table, recordId, segmentColumn, cityColumn, userScope) => {
  // Admin always has access
  if (userScope.isAdmin) {
    return true;
  }

  // User must have segments and cities assigned
  if (!userScope.segmentIds || userScope.segmentIds.length === 0 ||
      !userScope.cityIds || userScope.cityIds.length === 0) {
    return false;
  }

  try {
    const query = `
      SELECT id
      FROM ${table}
      WHERE id = $1
        AND ${segmentColumn} = ANY($2::text[])
        AND ${cityColumn} = ANY($3::uuid[])
    `;

    const result = await pool.query(query, [
      recordId,
      userScope.segmentIds,
      userScope.cityIds
    ]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Scope verification error:', error);
    return false;
  }
};

/**
 * Express middleware that returns 403 if record is not in user's scope
 * Use this on routes that modify/delete specific records
 *
 * Usage:
 * router.put('/:id',
 *   injectUserScope,
 *   requireRecordScope('professor_declarations', 'id'),
 *   async (req, res) => { ... }
 * );
 */
export const requireRecordScope = (table, idParam = 'id', segmentCol = 'segment_id', cityCol = 'city_id') => {
  return async (req, res, next) => {
    const recordId = req.params[idParam];
    const userScope = req.userScope;

    if (!userScope) {
      return res.status(500).json({
        success: false,
        error: 'Scope not injected. Use injectUserScope middleware first.',
        code: 'SCOPE_NOT_INJECTED'
      });
    }

    const inScope = await verifyRecordInScope(table, recordId, segmentCol, cityCol, userScope);

    if (!inScope) {
      console.warn(`⚠️ Scope violation attempt: User ${userScope.userId} tried to access ${table}:${recordId} outside their scope`);
      return res.status(403).json({
        success: false,
        error: 'Access denied. This record is outside your assigned scope (segment/city).',
        code: 'OUTSIDE_SCOPE'
      });
    }

    next();
  };
};

/**
 * Helper to log scope violations for auditing
 */
export const logScopeViolation = (userId, action, table, recordId, details = '') => {
  console.error(`
    🚨 SECURITY: Scope Violation Attempt
    User: ${userId}
    Action: ${action}
    Table: ${table}
    Record ID: ${recordId}
    Details: ${details}
    Timestamp: ${new Date().toISOString()}
  `);
};

export default {
  injectUserScope,
  buildScopeFilter,
  verifyRecordInScope,
  requireRecordScope,
  logScopeViolation
};
