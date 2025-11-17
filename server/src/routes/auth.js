import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { generateToken, loginRateLimiter, authenticateToken, getUserPermissions } from '../middleware/auth.js';

const router = express.Router();

// POST login with JWT token generation
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing username or password',
      });
    }

    // Find user with role information
    const result = await pool.query(
      `SELECT p.*, r.name as role_name, r.description as role_description
       FROM profiles p
       LEFT JOIN roles r ON p.role_id = r.id
       WHERE p.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Get user permissions
    let permissions = [];
    try {
      permissions = await getUserPermissions(user.id);
    } catch (err) {
      console.warn('Could not load permissions (tables may not exist yet):', err.message);
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
    const token = generateToken(userWithoutPassword);

    // Return user data with token and permissions
    res.json({
      success: true,
      user: userWithoutPassword,
      token,
      permissions,
      expiresIn: '24h',
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET current user (verify token and get fresh user data)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, r.name as role_name, r.description as role_description
       FROM profiles p
       LEFT JOIN roles r ON p.role_id = r.id
       WHERE p.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];
    const { password: _, ...userWithoutPassword } = user;

    // Get fresh permissions
    let permissions = [];
    try {
      permissions = await getUserPermissions(user.id);
    } catch (err) {
      console.warn('Could not load permissions:', err.message);
    }

    res.json({
      success: true,
      user: userWithoutPassword,
      permissions,
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    const newToken = generateToken(req.user);

    res.json({
      success: true,
      token: newToken,
      expiresIn: '24h',
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST logout (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, (req, res) => {
  // In a more advanced system, you would invalidate the token here
  // For now, just acknowledge the logout
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// POST change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters',
      });
    }

    // Get current user
    const userResult = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE profiles SET password = $1 WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
