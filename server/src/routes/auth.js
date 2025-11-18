import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { generateToken, loginRateLimiter, authenticateToken, getUserPermissions } from '../middleware/auth.js';

const router = express.Router();

// Helper function to check if RBAC tables exist
const checkRbacTablesExist = async () => {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'roles'
      ) as exists
    `);
    return result.rows[0].exists;
  } catch (err) {
    console.warn('Could not check for RBAC tables:', err.message);
    return false;
  }
};

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

    // Check if RBAC tables exist (backward compatibility)
    const rbacEnabled = await checkRbacTablesExist();

    // Strategy 1: Try to find user by username in profiles table
    let result;
    if (rbacEnabled) {
      result = await pool.query(
        `SELECT p.*, r.name as role_name, r.description as role_description
         FROM profiles p
         LEFT JOIN roles r ON p.role_id = r.id
         WHERE p.username = $1`,
        [username]
      );
    } else {
      // Fallback to old query without role join (backward compatibility)
      result = await pool.query(
        'SELECT * FROM profiles WHERE username = $1',
        [username]
      );
    }

    // Strategy 2: If not found by username, try to find student by CIN
    let user = null;
    let isStudentCINLogin = false;

    if (result.rows.length === 0) {
      // Check if username is a CIN in students table
      const studentResult = await pool.query(
        `SELECT s.*, p.id as profile_id, p.password as profile_password
         FROM students s
         LEFT JOIN profiles p ON p.username = s.cin
         WHERE s.cin = $1`,
        [username.toUpperCase()] // CIN is usually uppercase
      );

      if (studentResult.rows.length > 0) {
        const student = studentResult.rows[0];
        isStudentCINLogin = true;

        // Check if student has a linked profile account
        if (student.profile_id) {
          // Profile exists, use it for authentication
          user = {
            id: student.profile_id,
            username: student.cin,
            full_name: `${student.prenom} ${student.nom}`,
            role: 'student',
            password: student.profile_password,
            student_id: student.id,
            student_cin: student.cin,
            student_email: student.email,
            student_phone: student.phone
          };
        } else {
          // No profile exists yet - create one automatically for CIN-based login
          const hashedPassword = await bcrypt.hash(password, 10);

          const newProfileResult = await pool.query(
            `INSERT INTO profiles (username, password, full_name, role, created_at)
             VALUES ($1, $2, $3, 'student', NOW())
             RETURNING *`,
            [student.cin, hashedPassword, `${student.prenom} ${student.nom}`]
          );

          user = {
            ...newProfileResult.rows[0],
            student_id: student.id,
            student_cin: student.cin,
            student_email: student.email,
            student_phone: student.phone
          };

          console.log(`✅ Auto-created profile for student CIN: ${student.cin}`);
        }
      }
    } else {
      user = result.rows[0];
    }

    // If still no user found, return error
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Additional check for CIN-based login: Verify student is enrolled in at least one online session
    if (isStudentCINLogin && user.student_id) {
      const enrollmentCheck = await pool.query(
        `SELECT COUNT(*) as count
         FROM session_etudiants se
         JOIN sessions_formation sf ON se.session_id = sf.id
         WHERE se.student_id = $1
         AND sf.session_type = 'en_ligne'
         AND se.student_status != 'abandonne'`,
        [user.student_id]
      );

      const enrollmentCount = parseInt(enrollmentCheck.rows[0]?.count || 0);

      if (enrollmentCount === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous n\'êtes pas inscrit à une session de formation en ligne. Veuillez contacter l\'administration.',
        });
      }

      console.log(`✅ Student ${user.student_cin} verified: enrolled in ${enrollmentCount} online session(s)`);
    }

    // Get user permissions (only if RBAC is enabled)
    let permissions = [];
    if (rbacEnabled) {
      try {
        permissions = await getUserPermissions(user.id);
      } catch (err) {
        console.warn('Could not load permissions (tables may not exist yet):', err.message);
      }
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
    // Check if RBAC tables exist (backward compatibility)
    const rbacEnabled = await checkRbacTablesExist();

    let result;
    if (rbacEnabled) {
      result = await pool.query(
        `SELECT p.*, r.name as role_name, r.description as role_description
         FROM profiles p
         LEFT JOIN roles r ON p.role_id = r.id
         WHERE p.id = $1`,
        [req.user.id]
      );
    } else {
      // Fallback to old query without role join
      result = await pool.query(
        'SELECT * FROM profiles WHERE id = $1',
        [req.user.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];
    const { password: _, ...userWithoutPassword } = user;

    // Get fresh permissions (only if RBAC is enabled)
    let permissions = [];
    if (rbacEnabled) {
      try {
        permissions = await getUserPermissions(user.id);
      } catch (err) {
        console.warn('Could not load permissions:', err.message);
      }
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
