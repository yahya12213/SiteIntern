/**
 * JWT Authentication Middleware
 * Secures API routes with token-based authentication
 */

import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// JWT Secret - MUST be set in production .env
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-IMMEDIATELY';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Token generation
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    role_id: user.role_id,
    full_name: user.full_name,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Token verification middleware
export const authenticateToken = (req, res, next) => {
  // Allow public routes
  if (req.path === '/api/auth/login' || req.path === '/api/health') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.',
      code: 'NO_TOKEN',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(403).json({
        success: false,
        error: 'Invalid token.',
        code: 'INVALID_TOKEN',
      });
    }

    req.user = decoded;
    next();
  });
};

// Optional authentication - doesn't fail if no token, just sets req.user if valid
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  });
};

// Role-based access control middleware
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userRole = req.user.role;
    const hasRole = allowedRoles.includes(userRole);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}`,
        code: 'INSUFFICIENT_ROLE',
      });
    }

    next();
  };
};

// Permission-based access control middleware
export const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'NOT_AUTHENTICATED',
      });
    }

    try {
      // Check if user has any of the required permissions
      const permissions = await getUserPermissions(req.user.id);
      const hasPermission = requiredPermissions.some(perm => permissions.includes(perm));

      // Admin has all permissions
      if (req.user.role === 'admin' || permissions.includes('*')) {
        return next();
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required permission: ${requiredPermissions.join(' or ')}`,
          code: 'INSUFFICIENT_PERMISSION',
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error checking permissions',
        code: 'PERMISSION_CHECK_ERROR',
      });
    }
  };
};

// Get user's permissions from database
// Supports both old system (profiles.role_id) and new system (user_roles table)
export const getUserPermissions = async (userId) => {
  try {
    // First try the new user_roles table (N-N relationship)
    let query = `
      SELECT DISTINCT p.code
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      INNER JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
    `;
    let result = await pool.query(query, [userId]);

    // If no results from user_roles, fallback to old profiles.role_id system
    if (result.rows.length === 0) {
      query = `
        SELECT DISTINCT p.code
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN roles r ON rp.role_id = r.id
        INNER JOIN profiles pr ON pr.role_id = r.id
        WHERE pr.id = $1
      `;
      result = await pool.query(query, [userId]);
    }

    return result.rows.map(row => row.code);
  } catch (error) {
    // If tables don't exist yet (before migration), fall back to role-based
    console.warn('Permission tables not available, using role-based fallback:', error.message);
    return [];
  }
};

// Get user's role information
export const getUserRole = async (userId) => {
  try {
    const query = `
      SELECT r.*
      FROM roles r
      INNER JOIN profiles p ON p.role_id = r.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.warn('Roles table not available');
    return null;
  }
};

// Refresh token (issue new token with same user data)
export const refreshToken = (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'No valid token to refresh',
    });
  }

  const newToken = generateToken(req.user);
  res.json({
    success: true,
    token: newToken,
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Rate limiting middleware
import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (reduced from 15)
  max: 20, // 20 attempts per window (increased from 5)
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 5 minutes.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export { JWT_SECRET, JWT_EXPIRES_IN };
