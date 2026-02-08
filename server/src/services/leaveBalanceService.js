/**
 * Leave Balance Service
 *
 * Gestion du solde de congés selon la réglementation marocaine:
 * - Période de pointage: 19 du mois M au 18 du mois M+1
 * - Acquisition: 1.5 jour par mois ACHEVÉ (2 jours si mineur)
 * - Bonification ancienneté: +1.5j à +7.5j/an selon ancienneté
 * - Plafond: 30 jours maximum
 */

import pool from '../config/database.js';

/**
 * Calcule le bonus d'ancienneté selon l'Article 232 du Code du Travail
 * @param {Date} hireDate - Date d'embauche
 * @param {number} year - Année de référence
 * @returns {number} Bonus en jours/an
 */
export function calculateSeniorityBonus(hireDate, year = new Date().getFullYear()) {
  const referenceDate = new Date(year, 11, 31); // 31 décembre
  const yearsOfService = Math.floor(
    (referenceDate - new Date(hireDate)) / (365.25 * 24 * 60 * 60 * 1000)
  );

  if (yearsOfService < 5) return 0;
  if (yearsOfService < 10) return 1.5;
  if (yearsOfService < 15) return 3;
  if (yearsOfService < 20) return 4.5;
  if (yearsOfService < 25) return 6;
  return 7.5;
}

/**
 * Récupère ou crée le solde de congé d'un employé pour une année
 * @param {string} employeeId
 * @param {number} year
 * @param {object} client - Database client (optional)
 */
export async function getOrCreateLeaveBalance(employeeId, year, client = null) {
  const db = client || pool;

  // Chercher le solde existant
  let result = await db.query(`
    SELECT lb.*, lt.code as leave_type_code
    FROM hr_leave_balances lb
    JOIN hr_leave_types lt ON lt.id = lb.leave_type_id
    WHERE lb.employee_id = $1 AND lb.year = $2 AND lt.code = 'ANNUAL'
  `, [employeeId, year]);

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Récupérer l'employé et son solde initial
  const empResult = await db.query(`
    SELECT e.*, COALESCE(e.initial_leave_balance, 0) as initial_leave_balance
    FROM hr_employees e
    WHERE e.id = $1
  `, [employeeId]);

  if (empResult.rows.length === 0) {
    throw new Error('Employee not found');
  }

  const employee = empResult.rows[0];

  // Récupérer le type de congé annuel
  const typeResult = await db.query(`
    SELECT id FROM hr_leave_types WHERE code = 'ANNUAL'
  `);

  if (typeResult.rows.length === 0) {
    throw new Error('Leave type ANNUAL not found');
  }

  const leaveTypeId = typeResult.rows[0].id;

  // Calculer le solde initial et le report
  const hireYear = new Date(employee.hire_date).getFullYear();
  let initialBalance = 0;
  let carriedOver = 0;

  if (year > hireYear) {
    // Chercher le solde de l'année précédente
    const prevResult = await db.query(`
      SELECT current_balance FROM hr_leave_balances
      WHERE employee_id = $1 AND year = $2 AND leave_type_id = $3
    `, [employeeId, year - 1, leaveTypeId]);

    if (prevResult.rows.length > 0 && prevResult.rows[0].current_balance > 0) {
      // Report de l'année précédente (max 30 jours)
      carriedOver = Math.min(parseFloat(prevResult.rows[0].current_balance), 30);
    } else {
      // Pas de solde année précédente = première utilisation du système
      // Utiliser initial_leave_balance comme point de départ
      initialBalance = parseFloat(employee.initial_leave_balance || 0);
    }
  } else {
    // Année d'embauche - utiliser le solde initial
    initialBalance = parseFloat(employee.initial_leave_balance || 0);
  }

  // Créer le nouveau solde
  result = await db.query(`
    INSERT INTO hr_leave_balances (employee_id, leave_type_id, year, initial_balance, carried_over)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [employeeId, leaveTypeId, year, initialBalance, carriedOver]);

  return result.rows[0];
}

/**
 * Déduit du solde de congé lors de l'approbation d'une demande
 * @param {string} leaveRequestId
 * @param {string} approvedBy - ID du profil qui approuve
 * @param {object} client - Database client
 */
export async function deductLeaveBalance(leaveRequestId, approvedBy, client) {
  // Récupérer la demande de congé
  const requestResult = await client.query(`
    SELECT lr.*, e.id as emp_id, lt.code as leave_type_code
    FROM hr_leave_requests lr
    JOIN hr_employees e ON e.id = lr.employee_id
    JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.id = $1
  `, [leaveRequestId]);

  if (requestResult.rows.length === 0) {
    throw new Error('Leave request not found');
  }

  const request = requestResult.rows[0];

  // Vérifier si déjà déduit
  if (request.balance_deducted) {
    console.log(`Leave ${leaveRequestId} already deducted`);
    return;
  }

  const year = new Date(request.start_date).getFullYear();
  const daysRequested = parseFloat(request.days_requested);

  // Récupérer le solde actuel
  const balance = await getOrCreateLeaveBalance(request.employee_id, year, client);
  const currentBalance = parseFloat(balance.current_balance || 0);

  // Mettre à jour le solde (prendre les jours)
  await client.query(`
    UPDATE hr_leave_balances
    SET taken = taken + $1, updated_at = NOW()
    WHERE id = $2
  `, [daysRequested, balance.id]);

  // Enregistrer dans l'historique
  await client.query(`
    INSERT INTO hr_leave_balance_history (
      employee_id, leave_type_id, movement_type, amount,
      balance_before, balance_after, reference_id, description, created_by
    ) VALUES ($1, $2, 'deduction', $3, $4, $5, $6, $7, $8)
  `, [
    request.employee_id,
    request.leave_type_id,
    -daysRequested,
    currentBalance,
    currentBalance - daysRequested,
    leaveRequestId,
    `Congé du ${formatDate(request.start_date)} au ${formatDate(request.end_date)}`,
    approvedBy
  ]);

  // Marquer la demande comme déduite
  await client.query(`
    UPDATE hr_leave_requests
    SET balance_deducted = TRUE
    WHERE id = $1
  `, [leaveRequestId]);

  console.log(`✅ Deducted ${daysRequested} days from employee ${request.employee_id}. New balance: ${currentBalance - daysRequested}`);
}

/**
 * Calcule et ajoute l'acquisition mensuelle pour une période achevée
 * @param {string} employeeId
 * @param {string} periodId - Ex: "2026-02"
 * @param {object} client
 */
export async function accrueMonthlyLeave(employeeId, periodId, client) {
  // Vérifier si la période est achevée
  const periodResult = await client.query(`
    SELECT * FROM hr_leave_accrual_periods
    WHERE id = $1
  `, [periodId]);

  if (periodResult.rows.length === 0) {
    throw new Error(`Period ${periodId} not found`);
  }

  const period = periodResult.rows[0];
  const today = new Date();

  // La période doit être terminée (après le 18)
  if (today <= new Date(period.end_date)) {
    console.log(`Period ${periodId} not yet complete`);
    return null;
  }

  // Récupérer l'employé
  const empResult = await client.query(`
    SELECT * FROM hr_employees WHERE id = $1
  `, [employeeId]);

  if (empResult.rows.length === 0) {
    throw new Error('Employee not found');
  }

  const employee = empResult.rows[0];
  const hireDate = new Date(employee.hire_date);

  // Vérifier si l'employé était actif pendant la période
  if (hireDate > new Date(period.end_date)) {
    console.log(`Employee not hired during period ${periodId}`);
    return null;
  }

  if (employee.termination_date && new Date(employee.termination_date) < new Date(period.start_date)) {
    console.log(`Employee terminated before period ${periodId}`);
    return null;
  }

  // Vérifier si déjà acquis pour cette période
  const existingResult = await client.query(`
    SELECT * FROM hr_leave_balance_history
    WHERE employee_id = $1 AND period_id = $2 AND movement_type = 'accrual'
  `, [employeeId, periodId]);

  if (existingResult.rows.length > 0) {
    console.log(`Leave already accrued for ${employeeId} in period ${periodId}`);
    return null;
  }

  // Calculer les jours acquis (1.5 par mois, 2 si mineur)
  const birthDate = employee.birth_date ? new Date(employee.birth_date) : null;
  const isMinor = birthDate && ((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000)) < 18;
  const daysToAccrue = isMinor ? 2 : 1.5;

  // Récupérer le solde actuel
  const balance = await getOrCreateLeaveBalance(employeeId, period.year, client);
  const currentBalance = parseFloat(balance.current_balance || 0);

  // Vérifier le plafond (30 jours)
  const newBalance = Math.min(currentBalance + daysToAccrue, 30);
  const actualAccrued = newBalance - currentBalance;

  if (actualAccrued <= 0) {
    console.log(`Employee ${employeeId} at maximum balance`);
    return null;
  }

  // Mettre à jour le solde
  await client.query(`
    UPDATE hr_leave_balances
    SET accrued = accrued + $1, last_accrual_date = $2, updated_at = NOW()
    WHERE id = $3
  `, [actualAccrued, period.end_date, balance.id]);

  // Enregistrer dans l'historique
  await client.query(`
    INSERT INTO hr_leave_balance_history (
      employee_id, leave_type_id, movement_type, amount,
      balance_before, balance_after, period_id, description
    ) VALUES ($1, $2, 'accrual', $3, $4, $5, $6, $7)
  `, [
    employeeId,
    balance.leave_type_id,
    actualAccrued,
    currentBalance,
    newBalance,
    periodId,
    `Acquisition ${period.label}`
  ]);

  console.log(`✅ Accrued ${actualAccrued} days for employee ${employeeId} in period ${periodId}`);

  return { accrued: actualAccrued, newBalance };
}

/**
 * Récupère le solde de congé actuel d'un employé
 * @param {string} employeeId
 * @returns {object} { currentBalance, accrued, taken, initial, carriedOver }
 */
export async function getCurrentLeaveBalance(employeeId) {
  const year = new Date().getFullYear();
  const balance = await getOrCreateLeaveBalance(employeeId, year);

  return {
    year,
    currentBalance: parseFloat(balance.current_balance || 0),
    initial: parseFloat(balance.initial_balance || 0),
    accrued: parseFloat(balance.accrued || 0),
    taken: parseFloat(balance.taken || 0),
    carriedOver: parseFloat(balance.carried_over || 0),
    adjusted: parseFloat(balance.adjusted || 0)
  };
}

// Helper function
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
}

export default {
  calculateSeniorityBonus,
  getOrCreateLeaveBalance,
  deductLeaveBalance,
  accrueMonthlyLeave,
  getCurrentLeaveBalance
};
