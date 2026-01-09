import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

/**
 * Get all employees with filters
 * Protected: Requires hr.employees.view_page permission
 */
router.get('/',
  authenticateToken,
  requirePermission('hr.employees.view_page'),
  async (req, res) => {
  const { search, status, department, segment_id } = req.query;

  try {
    let query = `
      SELECT
        e.*,
        p.username as profile_username,
        s.name as segment_name,
        m.first_name || ' ' || m.last_name as manager_name
      FROM hr_employees e
      LEFT JOIN profiles p ON e.profile_id = p.id
      LEFT JOIN segments s ON e.segment_id = s.id
      LEFT JOIN hr_employees m ON e.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (
        e.first_name ILIKE $${paramCount} OR
        e.last_name ILIKE $${paramCount} OR
        e.employee_number ILIKE $${paramCount} OR
        e.cin ILIKE $${paramCount} OR
        e.email ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND e.employment_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (department) {
      query += ` AND e.department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (segment_id) {
      query += ` AND e.segment_id = $${paramCount}`;
      params.push(segment_id);
      paramCount++;
    }

    query += ' ORDER BY e.last_name, e.first_name';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get single employee with all details
 * Protected: Requires hr.employees.view_page permission
 */
router.get('/:id',
  authenticateToken,
  requirePermission('hr.employees.view_page'),
  async (req, res) => {
  try {
    const { id } = req.params;

    // Get employee
    const employee = await pool.query(`
      SELECT
        e.*,
        p.username as profile_username,
        s.name as segment_name,
        m.first_name || ' ' || m.last_name as manager_name
      FROM hr_employees e
      LEFT JOIN profiles p ON e.profile_id = p.id
      LEFT JOIN segments s ON e.segment_id = s.id
      LEFT JOIN hr_employees m ON e.manager_id = m.id
      WHERE e.id = $1
    `, [id]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // Get contracts
    const contracts = await pool.query(`
      SELECT * FROM hr_contracts
      WHERE employee_id = $1
      ORDER BY start_date DESC
    `, [id]);

    // Get documents
    const documents = await pool.query(`
      SELECT * FROM hr_employee_documents
      WHERE employee_id = $1
      ORDER BY uploaded_at DESC
    `, [id]);

    // Get disciplinary actions
    const disciplinary = await pool.query(`
      SELECT * FROM hr_disciplinary_actions
      WHERE employee_id = $1
      ORDER BY issue_date DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...employee.rows[0],
        contracts: contracts.rows,
        documents: documents.rows,
        disciplinary_actions: disciplinary.rows
      }
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create new employee
 * Protected: Requires hr.employees.create permission
 */
router.post('/',
  authenticateToken,
  requirePermission('hr.employees.create'),
  async (req, res) => {
  try {
    const {
      profile_id,
      employee_number,
      first_name,
      last_name,
      cin,
      birth_date,
      birth_place,
      email,
      phone,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      hire_date,
      employment_type,
      position,
      department,
      segment_id,
      manager_id,
      photo_url,
      notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO hr_employees (
        profile_id, employee_number, first_name, last_name, cin,
        birth_date, birth_place, email, phone, address,
        emergency_contact_name, emergency_contact_phone,
        hire_date, employment_type, position, department,
        segment_id, manager_id, photo_url, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      profile_id, employee_number, first_name, last_name, cin,
      birth_date, birth_place, email, phone, address,
      emergency_contact_name, emergency_contact_phone,
      hire_date, employment_type, position, department,
      segment_id, manager_id, photo_url, notes
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Employee number or CIN already exists' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * Update employee
 * Protected: Requires hr.employees.update permission
 */
router.put('/:id',
  authenticateToken,
  requirePermission('hr.employees.update'),
  async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    // Champs de type date qui doivent être null si vides
    const dateFields = ['birth_date', 'hire_date', 'termination_date', 'start_date', 'end_date', 'trial_period_end'];
    // Champs de type UUID/foreign key qui doivent être null si vides
    const fkFields = ['segment_id', 'ville_id', 'manager_id', 'department_id', 'user_id'];

    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
    const values = fields.map(f => {
      const val = updates[f];
      // Convertir les chaînes vides en null pour les champs date et FK
      if ((dateFields.includes(f) || fkFields.includes(f)) && val === '') {
        return null;
      }
      return val;
    });

    const result = await pool.query(
      `UPDATE hr_employees SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete employee
 * Protected: Requires hr.employees.delete permission
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('hr.employees.delete'),
  async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM hr_employees WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee deleted' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === CONTRACTS ===

/**
 * Add contract
 * Protected: Requires hr.contracts.manage permission
 */
router.post('/:id/contracts',
  authenticateToken,
  requirePermission('hr.contracts.manage'),
  async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_type,
      start_date,
      end_date,
      trial_period_end,
      base_salary,
      salary_currency,
      payment_frequency,
      work_hours_per_week,
      position,
      department,
      document_url,
      notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO hr_contracts (
        employee_id, contract_type, start_date, end_date,
        trial_period_end, base_salary, salary_currency,
        payment_frequency, work_hours_per_week, position,
        department, document_url, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      id, contract_type, start_date, end_date,
      trial_period_end, base_salary, salary_currency || 'MAD',
      payment_frequency || 'monthly', work_hours_per_week || 44,
      position, department, document_url, notes, req.user.id
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === DOCUMENTS ===

/**
 * Add document
 * Protected: Requires hr.documents.manage permission
 */
router.post('/:id/documents',
  authenticateToken,
  requirePermission('hr.documents.manage'),
  async (req, res) => {
  try {
    const { id } = req.params;
    const {
      document_type,
      title,
      description,
      file_url,
      file_name,
      file_size,
      mime_type,
      expiry_date
    } = req.body;

    const result = await pool.query(`
      INSERT INTO hr_employee_documents (
        employee_id, document_type, title, description,
        file_url, file_name, file_size, mime_type,
        expiry_date, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id, document_type, title, description,
      file_url, file_name, file_size, mime_type,
      expiry_date, req.user.id
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify document
/**
 * Verify document
 * Protected: Requires hr.documents.verify permission
 */
router.put('/documents/:docId/verify',
  authenticateToken,
  requirePermission('hr.documents.verify'),
  async (req, res) => {
  try {
    const { docId } = req.params;
    const result = await pool.query(`
      UPDATE hr_employee_documents
      SET is_verified = true, verified_by = $1, verified_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [req.user.id, docId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === DISCIPLINARY ===

// Add disciplinary action
/**
 * Add disciplinary action
 * Protected: Requires hr.discipline.manage permission
 */
router.post('/:id/disciplinary',
  authenticateToken,
  requirePermission('hr.discipline.manage'),
  async (req, res) => {
  try {
    const { id } = req.params;
    const {
      action_type,
      severity,
      issue_date,
      reason,
      description,
      document_url,
      duration_days,
      salary_impact,
      witnesses
    } = req.body;

    const result = await pool.query(`
      INSERT INTO hr_disciplinary_actions (
        employee_id, action_type, severity, issue_date,
        reason, description, document_url, duration_days,
        salary_impact, witnesses, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      id, action_type, severity, issue_date,
      reason, description, document_url, duration_days,
      salary_impact, witnesses || [], req.user.id
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating disciplinary action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get departments list
 * Protected: Requires hr.employees.view_page permission
 */
router.get('/meta/departments',
  authenticateToken,
  requirePermission('hr.employees.view_page'),
  async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT department
      FROM hr_employees
      WHERE department IS NOT NULL
      ORDER BY department
    `);
    res.json({ success: true, data: result.rows.map(r => r.department) });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === MULTI-MANAGERS ===

/**
 * Get all managers for an employee
 * Protected: Requires hr.employees.view_page permission
 */
router.get('/:id/managers',
  authenticateToken,
  requirePermission('hr.employees.view_page'),
  async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        em.id,
        em.employee_id,
        em.manager_id,
        em.rank,
        em.is_active,
        em.created_at,
        m.first_name || ' ' || m.last_name as manager_name,
        m.position as manager_position,
        m.employee_number as manager_employee_number
      FROM hr_employee_managers em
      JOIN hr_employees m ON em.manager_id = m.id
      WHERE em.employee_id = $1 AND em.is_active = true
      ORDER BY em.rank ASC
    `, [id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employee managers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update managers for an employee (replace all)
 * Protected: Requires hr.employees.update permission
 *
 * Body: { managers: [{ manager_id: uuid, rank: number }, ...] }
 * - Rank 0 (N) = direct manager (required)
 * - Rank 1 (N+1) = superior manager
 * - Rank 2+ (N+2, N+3...) = higher levels
 */
router.put('/:id/managers',
  authenticateToken,
  requirePermission('hr.employees.update'),
  async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { managers } = req.body;

    if (!Array.isArray(managers)) {
      return res.status(400).json({
        success: false,
        error: 'managers must be an array'
      });
    }

    // Validate: at least one manager at rank 0 (N)
    const hasDirectManager = managers.some(m => m.rank === 0);
    if (managers.length > 0 && !hasDirectManager) {
      return res.status(400).json({
        success: false,
        error: 'Un manager direct (rang N) est obligatoire'
      });
    }

    // Validate: no duplicate ranks
    const ranks = managers.map(m => m.rank);
    if (new Set(ranks).size !== ranks.length) {
      return res.status(400).json({
        success: false,
        error: 'Chaque rang ne peut avoir qu\'un seul manager'
      });
    }

    // Validate: employee cannot be their own manager
    if (managers.some(m => m.manager_id === id)) {
      return res.status(400).json({
        success: false,
        error: 'Un employé ne peut pas être son propre manager'
      });
    }

    await client.query('BEGIN');

    // Deactivate all existing managers for this employee
    await client.query(`
      UPDATE hr_employee_managers
      SET is_active = false, updated_at = NOW()
      WHERE employee_id = $1
    `, [id]);

    // Insert new managers
    for (const manager of managers) {
      await client.query(`
        INSERT INTO hr_employee_managers (employee_id, manager_id, rank, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (employee_id, manager_id)
        DO UPDATE SET rank = $3, is_active = true, updated_at = NOW()
      `, [id, manager.manager_id, manager.rank]);
    }

    // Also update the legacy manager_id field with the direct manager (rank 0)
    const directManager = managers.find(m => m.rank === 0);
    if (directManager) {
      await client.query(`
        UPDATE hr_employees SET manager_id = $1, updated_at = NOW() WHERE id = $2
      `, [directManager.manager_id, id]);
    } else {
      await client.query(`
        UPDATE hr_employees SET manager_id = NULL, updated_at = NOW() WHERE id = $1
      `, [id]);
    }

    await client.query('COMMIT');

    // Fetch the updated managers list
    const result = await pool.query(`
      SELECT
        em.id,
        em.employee_id,
        em.manager_id,
        em.rank,
        em.is_active,
        m.first_name || ' ' || m.last_name as manager_name,
        m.position as manager_position
      FROM hr_employee_managers em
      JOIN hr_employees m ON em.manager_id = m.id
      WHERE em.employee_id = $1 AND em.is_active = true
      ORDER BY em.rank ASC
    `, [id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating employee managers:', error);

    if (error.code === '23503') {
      res.status(400).json({ success: false, error: 'Manager not found' });
    } else if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Duplicate manager or rank' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  } finally {
    client.release();
  }
});

/**
 * Get the approval chain for an employee (all active managers in order)
 * Protected: Requires hr.employees.view_page permission
 */
router.get('/:id/approval-chain',
  authenticateToken,
  requirePermission('hr.employees.view_page'),
  async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        em.rank,
        em.manager_id,
        m.first_name || ' ' || m.last_name as manager_name,
        m.email as manager_email,
        m.position as manager_position
      FROM hr_employee_managers em
      JOIN hr_employees m ON em.manager_id = m.id
      WHERE em.employee_id = $1 AND em.is_active = true
      ORDER BY em.rank ASC
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
      approval_levels: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching approval chain:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
