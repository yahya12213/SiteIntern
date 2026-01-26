/**
 * API Routes pour les primes d'assistante basées sur les inscriptions
 *
 * Calcule les primes journalières pour les assistantes basées sur:
 * - Les inscriptions d'étudiants dans les sessions
 * - Le matching segment/ville entre l'employé et la session
 * - La prime configurée par formation
 * - L'objectif d'inscription défini dans le dossier employé
 */

import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

/**
 * Calcule la prime d'assistante pour un employé et une date donnée
 *
 * GET /api/hr/assistant-bonus/calculate
 * Params: employee_id (required), date (optional, default: today)
 *
 * Retourne:
 * - inscriptions: liste des inscriptions du jour avec primes
 * - prime_journaliere: somme des primes du jour
 * - total_periode: nombre total d'inscriptions dans la période d'objectif
 * - objectif: objectif d'inscriptions de l'employé
 * - objectif_atteint: boolean si objectif >= total_periode
 * - periode: dates de début et fin de la période d'objectif
 */
router.get('/calculate',
  authenticateToken,
  async (req, res) => {
    const { employee_id, date } = req.query;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        error: 'employee_id est requis'
      });
    }

    try {
      // Récupérer les infos de l'employé (segment, ville, objectif, période)
      const employeeResult = await pool.query(`
        SELECT
          id,
          first_name || ' ' || last_name as employee_name,
          segment_id,
          ville_id,
          COALESCE(inscription_objective, 0) as inscription_objective,
          objective_period_start,
          objective_period_end
        FROM hr_employees
        WHERE id = $1
      `, [employee_id]);

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Employé non trouvé'
        });
      }

      const employee = employeeResult.rows[0];
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Vérifier si l'employé a un segment assigné
      if (!employee.segment_id) {
        return res.json({
          success: true,
          data: {
            date: targetDate,
            employee_id,
            employee_name: employee.employee_name,
            inscriptions: [],
            prime_journaliere: 0,
            total_periode: 0,
            objectif: employee.inscription_objective,
            objectif_atteint: employee.inscription_objective === 0,
            periode: {
              start: employee.objective_period_start,
              end: employee.objective_period_end
            },
            message: 'Aucun segment assigné à cet employé'
          }
        });
      }

      // Récupérer les inscriptions du jour matching segment/ville
      let inscriptionsQuery = `
        SELECT
          se.id as enrollment_id,
          se.session_id,
          se.formation_id,
          f.title as formation_name,
          COALESCE(f.prime_assistante, 0) as prime_assistante,
          sf.titre as session_name,
          s.name as segment_name,
          c.name as city_name,
          se.created_at::date as enrollment_date,
          st.first_name || ' ' || st.last_name as student_name
        FROM session_etudiants se
        JOIN sessions_formation sf ON sf.id = se.session_id
        JOIN formations f ON f.id = se.formation_id
        LEFT JOIN segments s ON s.id = sf.segment_id
        LEFT JOIN cities c ON c.id = sf.ville_id
        LEFT JOIN students st ON st.id = se.student_id
        WHERE sf.segment_id = $1
      `;

      const params = [employee.segment_id];
      let paramIndex = 2;

      // Ajouter filtre ville si l'employé a une ville assignée
      if (employee.ville_id) {
        inscriptionsQuery += ` AND sf.ville_id = $${paramIndex}`;
        params.push(employee.ville_id);
        paramIndex++;
      }

      // Filtrer par date
      inscriptionsQuery += ` AND se.created_at::date = $${paramIndex}`;
      params.push(targetDate);
      paramIndex++;

      // Seulement les formations avec prime > 0
      inscriptionsQuery += ` AND COALESCE(f.prime_assistante, 0) > 0`;

      inscriptionsQuery += ` ORDER BY se.created_at DESC`;

      const inscriptionsResult = await pool.query(inscriptionsQuery, params);

      // Calculer la prime journalière
      const prime_journaliere = inscriptionsResult.rows.reduce(
        (sum, row) => sum + parseFloat(row.prime_assistante || 0),
        0
      );

      // Calculer le total d'inscriptions dans la période d'objectif
      let total_periode = 0;
      if (employee.objective_period_start && employee.objective_period_end) {
        let periodQuery = `
          SELECT COUNT(*) as count
          FROM session_etudiants se
          JOIN sessions_formation sf ON sf.id = se.session_id
          WHERE sf.segment_id = $1
            AND se.created_at::date >= $2
            AND se.created_at::date <= $3
        `;
        const periodParams = [
          employee.segment_id,
          employee.objective_period_start,
          employee.objective_period_end
        ];

        if (employee.ville_id) {
          periodQuery += ` AND sf.ville_id = $4`;
          periodParams.push(employee.ville_id);
        }

        const periodResult = await pool.query(periodQuery, periodParams);
        total_periode = parseInt(periodResult.rows[0].count);
      }

      // Déterminer si l'objectif est atteint
      const objectif_atteint = total_periode >= employee.inscription_objective;

      res.json({
        success: true,
        data: {
          date: targetDate,
          employee_id,
          employee_name: employee.employee_name,
          segment_id: employee.segment_id,
          ville_id: employee.ville_id,
          inscriptions: inscriptionsResult.rows,
          inscriptions_count: inscriptionsResult.rows.length,
          prime_journaliere,
          total_periode,
          objectif: employee.inscription_objective,
          objectif_atteint,
          periode: {
            start: employee.objective_period_start,
            end: employee.objective_period_end
          }
        }
      });

    } catch (error) {
      console.error('Error calculating assistant bonus:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Récupère les primes d'une période pour un employé
 *
 * GET /api/hr/assistant-bonus/period
 * Params: employee_id, start_date, end_date
 */
router.get('/period',
  authenticateToken,
  async (req, res) => {
    const { employee_id, start_date, end_date } = req.query;

    if (!employee_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'employee_id, start_date et end_date sont requis'
      });
    }

    try {
      // Récupérer les infos de l'employé
      const employeeResult = await pool.query(`
        SELECT
          id,
          first_name || ' ' || last_name as employee_name,
          segment_id,
          ville_id,
          COALESCE(inscription_objective, 0) as inscription_objective,
          objective_period_start,
          objective_period_end
        FROM hr_employees
        WHERE id = $1
      `, [employee_id]);

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Employé non trouvé'
        });
      }

      const employee = employeeResult.rows[0];

      if (!employee.segment_id) {
        return res.json({
          success: true,
          data: {
            employee_id,
            employee_name: employee.employee_name,
            daily_bonuses: [],
            total_prime: 0,
            total_inscriptions: 0,
            objectif: employee.inscription_objective,
            objectif_atteint: false
          }
        });
      }

      // Récupérer les primes par jour dans la période
      let query = `
        SELECT
          se.created_at::date as date,
          COUNT(*) as inscriptions_count,
          SUM(COALESCE(f.prime_assistante, 0)) as prime_journaliere
        FROM session_etudiants se
        JOIN sessions_formation sf ON sf.id = se.session_id
        JOIN formations f ON f.id = se.formation_id
        WHERE sf.segment_id = $1
          AND se.created_at::date >= $2
          AND se.created_at::date <= $3
          AND COALESCE(f.prime_assistante, 0) > 0
      `;

      const params = [employee.segment_id, start_date, end_date];

      if (employee.ville_id) {
        query += ` AND sf.ville_id = $4`;
        params.push(employee.ville_id);
      }

      query += ` GROUP BY se.created_at::date ORDER BY date`;

      const dailyResult = await pool.query(query, params);

      // Calculer les totaux
      const total_prime = dailyResult.rows.reduce(
        (sum, row) => sum + parseFloat(row.prime_journaliere || 0),
        0
      );
      const total_inscriptions = dailyResult.rows.reduce(
        (sum, row) => sum + parseInt(row.inscriptions_count || 0),
        0
      );

      // Déterminer si l'objectif est atteint (basé sur la période d'objectif de l'employé)
      let objectif_atteint = false;
      if (employee.objective_period_start && employee.objective_period_end) {
        // Compter toutes les inscriptions dans la période d'objectif
        let periodQuery = `
          SELECT COUNT(*) as count
          FROM session_etudiants se
          JOIN sessions_formation sf ON sf.id = se.session_id
          WHERE sf.segment_id = $1
            AND se.created_at::date >= $2
            AND se.created_at::date <= $3
        `;
        const periodParams = [
          employee.segment_id,
          employee.objective_period_start,
          employee.objective_period_end
        ];

        if (employee.ville_id) {
          periodQuery += ` AND sf.ville_id = $4`;
          periodParams.push(employee.ville_id);
        }

        const periodResult = await pool.query(periodQuery, periodParams);
        const total_periode = parseInt(periodResult.rows[0].count);
        objectif_atteint = total_periode >= employee.inscription_objective;
      }

      res.json({
        success: true,
        data: {
          employee_id,
          employee_name: employee.employee_name,
          start_date,
          end_date,
          daily_bonuses: dailyResult.rows,
          total_prime,
          total_inscriptions,
          objectif: employee.inscription_objective,
          objectif_atteint,
          periode_objectif: {
            start: employee.objective_period_start,
            end: employee.objective_period_end
          }
        }
      });

    } catch (error) {
      console.error('Error fetching period bonuses:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Récupère le résumé des primes pour plusieurs employés (batch)
 *
 * POST /api/hr/assistant-bonus/batch
 * Body: { employee_ids: [], date }
 */
router.post('/batch',
  authenticateToken,
  async (req, res) => {
    const { employee_ids, date } = req.body;

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'employee_ids array est requis'
      });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const results = {};

      for (const employee_id of employee_ids) {
        // Récupérer les infos de l'employé
        const employeeResult = await pool.query(`
          SELECT
            id,
            segment_id,
            ville_id,
            COALESCE(inscription_objective, 0) as inscription_objective,
            objective_period_start,
            objective_period_end
          FROM hr_employees
          WHERE id = $1
        `, [employee_id]);

        if (employeeResult.rows.length === 0) {
          results[employee_id] = { prime_journaliere: 0, objectif_atteint: false };
          continue;
        }

        const employee = employeeResult.rows[0];

        if (!employee.segment_id) {
          results[employee_id] = { prime_journaliere: 0, objectif_atteint: employee.inscription_objective === 0 };
          continue;
        }

        // Calculer la prime du jour
        let primeQuery = `
          SELECT COALESCE(SUM(f.prime_assistante), 0) as prime_journaliere
          FROM session_etudiants se
          JOIN sessions_formation sf ON sf.id = se.session_id
          JOIN formations f ON f.id = se.formation_id
          WHERE sf.segment_id = $1
            AND se.created_at::date = $2
            AND COALESCE(f.prime_assistante, 0) > 0
        `;
        const primeParams = [employee.segment_id, targetDate];

        if (employee.ville_id) {
          primeQuery = primeQuery.replace('AND COALESCE(f.prime_assistante', 'AND sf.ville_id = $3 AND COALESCE(f.prime_assistante');
          primeParams.push(employee.ville_id);
        }

        const primeResult = await pool.query(primeQuery, primeParams);
        const prime_journaliere = parseFloat(primeResult.rows[0].prime_journaliere || 0);

        // Vérifier l'objectif
        let objectif_atteint = employee.inscription_objective === 0;
        if (employee.objective_period_start && employee.objective_period_end && employee.inscription_objective > 0) {
          let periodQuery = `
            SELECT COUNT(*) as count
            FROM session_etudiants se
            JOIN sessions_formation sf ON sf.id = se.session_id
            WHERE sf.segment_id = $1
              AND se.created_at::date >= $2
              AND se.created_at::date <= $3
          `;
          const periodParams = [
            employee.segment_id,
            employee.objective_period_start,
            employee.objective_period_end
          ];

          if (employee.ville_id) {
            periodQuery += ` AND sf.ville_id = $4`;
            periodParams.push(employee.ville_id);
          }

          const periodResult = await pool.query(periodQuery, periodParams);
          const total_periode = parseInt(periodResult.rows[0].count);
          objectif_atteint = total_periode >= employee.inscription_objective;
        }

        results[employee_id] = {
          prime_journaliere,
          objectif_atteint,
          objectif: employee.inscription_objective,
          total_periode: objectif_atteint ? employee.inscription_objective : 0
        };
      }

      res.json({
        success: true,
        data: results,
        date: targetDate
      });

    } catch (error) {
      console.error('Error batch calculating bonuses:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
