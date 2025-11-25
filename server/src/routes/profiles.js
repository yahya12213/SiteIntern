import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { injectUserScope } from '../middleware/requireScope.js';

const router = express.Router();

/**
 * GET tous les profils (sans mots de passe)
 * Protected: SBAC filtering only (no permission check)
 * Non-admin users only see users from their assigned segments/cities
 * Permission check removed to allow dropdown usage without view_page permission
 */
router.get('/',
  authenticateToken,
  injectUserScope,
  async (req, res) => {
  try {
    const scope = req.userScope;
    let query;
    let params = [];

    // Admin voit tous les utilisateurs
    if (!scope || scope.isAdmin) {
      query = `
        SELECT id, username, full_name, role, created_at
        FROM profiles
        ORDER BY full_name
      `;
    } else {
      // Non-admin: voit seulement les utilisateurs des mêmes segments/villes (SBAC)
      const { segmentIds, cityIds } = scope;

      if (segmentIds.length === 0 && cityIds.length === 0) {
        // User has no scope assigned - return only self
        query = `
          SELECT id, username, full_name, role, created_at
          FROM profiles
          WHERE id = $1
          ORDER BY full_name
        `;
        params = [req.user.id];
      } else {
        // Filter by shared segments/cities
        query = `
          SELECT DISTINCT p.id, p.username, p.full_name, p.role, p.created_at
          FROM profiles p
          LEFT JOIN professor_segments ps ON p.id = ps.professor_id
          LEFT JOIN professor_cities pc ON p.id = pc.professor_id
          WHERE
            p.id = $1  -- Always include self
        `;
        params = [req.user.id];

        if (segmentIds.length > 0) {
          const segmentPlaceholders = segmentIds.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
          query += ` OR ps.segment_id IN (${segmentPlaceholders})`;
          params.push(...segmentIds);
        }

        if (cityIds.length > 0) {
          const cityPlaceholders = cityIds.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
          query += ` OR pc.city_id IN (${cityPlaceholders})`;
          params.push(...cityIds);
        }

        query += ' ORDER BY p.full_name';
      }
    }

    const result = await pool.query(query, params);

    // Pour chaque profil, récupérer ses segments et villes
    const profiles = await Promise.all(
      result.rows.map(async (profile) => {
        // Récupérer les segments
        const segmentsResult = await pool.query(
          'SELECT segment_id FROM professor_segments WHERE professor_id = $1',
          [profile.id]
        );
        profile.segment_ids = segmentsResult.rows.map(row => row.segment_id);

        // Récupérer les villes
        const citiesResult = await pool.query(
          'SELECT city_id FROM professor_cities WHERE professor_id = $1',
          [profile.id]
        );
        profile.city_ids = citiesResult.rows.map(row => row.city_id);

        return profile;
      })
    );

    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET tous les professeurs seulement (role='professor')
 * Protected: SBAC filtering only (no permission check)
 * Server-side filtering by role to ensure only professors are returned
 * Non-admin users only see professors from their assigned segments/cities
 */
router.get('/professors',
  authenticateToken,
  injectUserScope,
  async (req, res) => {
  try {
    const { segment_id, city_id } = req.query;
    const scope = req.userScope;

    console.log('======================================');
    console.log('🔍 GET /profiles/professors - STARTING');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Query params:', req.query);
    console.log('Segment ID filter:', segment_id || 'none');
    console.log('City ID filter:', city_id || 'none');
    console.log('User ID:', req.user?.id);
    console.log('User role:', req.user?.role);
    console.log('======================================');

    let query;
    let params = [];

    // Admin voit tous les professeurs avec filtres optionnels
    if (!scope || scope.isAdmin) {
      query = `
        SELECT id, username, full_name, role, created_at
        FROM profiles
        WHERE role = 'professor'
      `;

      // Add segment filter if provided
      if (segment_id) {
        query += ' AND EXISTS (SELECT 1 FROM professor_segments WHERE professor_id = profiles.id AND segment_id = $1)';
        params.push(segment_id);
      }

      // Add city filter if provided
      if (city_id) {
        const paramNum = params.length + 1;
        query += ` AND EXISTS (SELECT 1 FROM professor_cities WHERE professor_id = profiles.id AND city_id = $${paramNum})`;
        params.push(city_id);
      }

      query += ' ORDER BY full_name';
    } else {
      // Non-admin: voit seulement les professeurs des mêmes segments/villes (SBAC)
      const { segmentIds, cityIds } = scope;

      if (segmentIds.length === 0 && cityIds.length === 0) {
        // User has no scope assigned - return only self if professor
        query = `
          SELECT id, username, full_name, role, created_at
          FROM profiles
          WHERE id = $1 AND role = 'professor'
        `;
        params = [req.user.id];

        // Add filters even for self
        if (segment_id) {
          params.push(segment_id);
          query += ` AND EXISTS (SELECT 1 FROM professor_segments WHERE professor_id = profiles.id AND segment_id = $2)`;
        }
        if (city_id) {
          params.push(city_id);
          query += ` AND EXISTS (SELECT 1 FROM professor_cities WHERE professor_id = profiles.id AND city_id = $${params.length})`;
        }

        query += ' ORDER BY full_name';
      } else {
        // Filter by shared segments/cities AND role='professor'
        query = `
          SELECT DISTINCT p.id, p.username, p.full_name, p.role, p.created_at
          FROM profiles p
          LEFT JOIN professor_segments ps ON p.id = ps.professor_id
          LEFT JOIN professor_cities pc ON p.id = pc.professor_id
          WHERE p.role = 'professor' AND (
            p.id = $1  -- Always include self if professor
        `;
        params = [req.user.id];

        if (segmentIds.length > 0) {
          const segmentPlaceholders = segmentIds.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
          query += ` OR ps.segment_id IN (${segmentPlaceholders})`;
          params.push(...segmentIds);
        }

        if (cityIds.length > 0) {
          const cityPlaceholders = cityIds.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
          query += ` OR pc.city_id IN (${cityPlaceholders})`;
          params.push(...cityIds);
        }

        query += ')';

        // Apply additional segment/city filters if provided
        if (segment_id) {
          params.push(segment_id);
          query += ` AND EXISTS (SELECT 1 FROM professor_segments WHERE professor_id = p.id AND segment_id = $${params.length})`;
        }
        if (city_id) {
          params.push(city_id);
          query += ` AND EXISTS (SELECT 1 FROM professor_cities WHERE professor_id = p.id AND city_id = $${params.length})`;
        }

        query += ' ORDER BY p.full_name';
      }
    }

    console.log('🔄 Executing SQL query...');
    console.log('SQL:', query.trim());
    console.log('Parameters:', params);

    const result = await pool.query(query, params);

    // 🔍 DEBUG: Log ce que la requête SQL a retourné
    console.log('======================================');
    console.log('🔍 GET /profiles/professors - SQL RESULTS');
    console.log('======================================');
    console.log(`Found ${result.rows.length} users with role='professor'`);
    if (segment_id) console.log(`  - Filtered by segment: ${segment_id}`);
    if (city_id) console.log(`  - Filtered by city: ${city_id}`);

    // Check if "khalid" is in the results
    const khalidEntries = result.rows.filter(row =>
      row.full_name?.toLowerCase().includes('khalid') ||
      row.username?.toLowerCase().includes('khalid')
    );

    if (khalidEntries.length > 0) {
      console.log('⚠️ WARNING: "khalid" found in results');
      console.log('Khalid entries:');
      khalidEntries.forEach(row => {
        console.log(`  - ${row.full_name} (${row.username}) - Role: "${row.role}"`);
        console.log(`    ID: ${row.id}`);
      });
      console.log('⚠️ CRITICAL: If khalid has role != "professor", this is a BUG!');
    } else {
      console.log('✅ No "khalid" in results (correct - khalid is not a professor)');
    }

    // Log first 3 entries for debugging
    if (result.rows.length > 0) {
      console.log('\nFirst 3 professors returned:');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.full_name} (role: "${row.role}")`);
      });
    } else {
      console.log('\n⚠️ NO PROFESSORS FOUND with current filters');
    }
    console.log('======================================\n');

    // Pour chaque professeur, récupérer ses segments et villes
    const professors = await Promise.all(
      result.rows.map(async (professor) => {
        // Récupérer les segments
        const segmentsResult = await pool.query(
          'SELECT segment_id FROM professor_segments WHERE professor_id = $1',
          [professor.id]
        );
        professor.segment_ids = segmentsResult.rows.map(row => row.segment_id);

        // Récupérer les villes
        const citiesResult = await pool.query(
          'SELECT city_id FROM professor_cities WHERE professor_id = $1',
          [professor.id]
        );
        professor.city_ids = citiesResult.rows.map(row => row.city_id);

        return professor;
      })
    );

    // 🔍 DEBUG: Log la réponse finale avant de l'envoyer
    console.log('🔍 GET /profiles/professors - FINAL RESPONSE');
    console.log(`📤 Returning ${professors.length} professors to client`);
    console.log('Professors list:', professors.map(p => p.full_name).join(', ') || '(empty)');

    // Final check for khalid
    const khalidInFinal = professors.some(p =>
      p.full_name?.toLowerCase().includes('khalid') ||
      p.username?.toLowerCase().includes('khalid')
    );
    if (khalidInFinal) {
      console.log('⚠️ CRITICAL BUG: "khalid" is in final response being sent to client!');
    }
    console.log('======================================\n');

    res.json(professors);
  } catch (error) {
    console.error('Error fetching professors:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET un profil avec ses segments et villes
 * Protected: SBAC only - non-admins can only access users from their assigned segments/cities
 * Permission check removed to allow dropdown usage without view_page permission
 */
router.get('/:id',
  authenticateToken,
  injectUserScope,
  async (req, res) => {
  try {
    const { id } = req.params;
    const scope = req.userScope;

    let query;
    let params;

    // Admin peut voir n'importe quel profil
    if (!scope || scope.isAdmin) {
      query = 'SELECT id, username, full_name, role, created_at FROM profiles WHERE id = $1';
      params = [id];
    } else {
      // Non-admin: vérifier que l'utilisateur demandé partage au moins un segment/ville (SBAC)
      const { segmentIds, cityIds } = scope;

      if (segmentIds.length === 0 && cityIds.length === 0) {
        // User has no scope - can only access self
        if (id !== req.user.id) {
          return res.status(404).json({ error: 'Profile not found or access denied' });
        }
        query = 'SELECT id, username, full_name, role, created_at FROM profiles WHERE id = $1';
        params = [id];
      } else {
        // Vérifier que le profil demandé partage au moins un segment/ville
        query = `
          SELECT DISTINCT p.id, p.username, p.full_name, p.role, p.created_at
          FROM profiles p
          LEFT JOIN professor_segments ps ON p.id = ps.professor_id
          LEFT JOIN professor_cities pc ON p.id = pc.professor_id
          WHERE p.id = $1 AND (
            p.id = $2  -- Always allow self
        `;
        params = [id, req.user.id];

        if (segmentIds.length > 0) {
          const segmentPlaceholders = segmentIds.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
          query += ` OR ps.segment_id IN (${segmentPlaceholders})`;
          params.push(...segmentIds);
        }

        if (cityIds.length > 0) {
          const cityPlaceholders = cityIds.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
          query += ` OR pc.city_id IN (${cityPlaceholders})`;
          params.push(...cityIds);
        }

        query += ')';
      }
    }

    const profileResult = await pool.query(query, params);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found or access denied' });
    }

    const profile = profileResult.rows[0];

    // Segments
    const segmentsResult = await pool.query(
      'SELECT segment_id FROM professor_segments WHERE professor_id = $1',
      [id]
    );
    profile.segment_ids = segmentsResult.rows.map(row => row.segment_id);

    // Villes
    const citiesResult = await pool.query(
      'SELECT city_id FROM professor_cities WHERE professor_id = $1',
      [id]
    );
    profile.city_ids = citiesResult.rows.map(row => row.city_id);

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST créer un profil
 * Protected: Requires authentication and users create permission
 * Security: Only admins can create admin accounts
 */
router.post('/',
  authenticateToken,
  requirePermission('accounting.users.create'),
  async (req, res) => {
  const client = await pool.connect();

  try {
    const { id, username, password, full_name, role, segment_ids, city_ids } = req.body;

    if (!id || !username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Security check: Only admins can create admin accounts
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can create admin accounts',
        code: 'FORBIDDEN_ADMIN_CREATION'
      });
    }

    await client.query('BEGIN');

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer le profil
    const profileResult = await client.query(
      'INSERT INTO profiles (id, username, password, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, role, created_at',
      [id, username, hashedPassword, full_name, role]
    );

    const profile = profileResult.rows[0];

    // Ajouter les segments
    if (segment_ids && segment_ids.length > 0) {
      for (const segmentId of segment_ids) {
        await client.query(
          'INSERT INTO professor_segments (professor_id, segment_id) VALUES ($1, $2)',
          [id, segmentId]
        );
      }
      profile.segment_ids = segment_ids;
    }

    // Ajouter les villes
    if (city_ids && city_ids.length > 0) {
      for (const cityId of city_ids) {
        await client.query(
          'INSERT INTO professor_cities (professor_id, city_id) VALUES ($1, $2)',
          [id, cityId]
        );
      }
      profile.city_ids = city_ids;
    }

    await client.query('COMMIT');
    res.status(201).json(profile);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating profile:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * PUT mettre à jour un profil (support des mises à jour partielles)
 * Protected: Requires authentication and users update permission
 * Security: Users cannot change their own role; Only admins can assign admin role
 */
router.put('/:id',
  authenticateToken,
  requirePermission('accounting.users.update'),
  async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { username, full_name, role, segment_ids, city_ids, password } = req.body;

    // Security check 1: Prevent self-role elevation
    // Users cannot change their own role unless they are admin
    if (role !== undefined && id === req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You cannot change your own role',
        code: 'FORBIDDEN_SELF_ROLE_CHANGE'
      });
    }

    // Security check 2: Only admins can assign admin role
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can assign admin role',
        code: 'FORBIDDEN_ADMIN_ASSIGNMENT'
      });
    }

    await client.query('BEGIN');

    // Vérifier si le profil existe
    const checkResult = await client.query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Déterminer si on doit mettre à jour la table profiles
    const hasProfileFields = username !== undefined || full_name !== undefined || role !== undefined || password !== undefined;

    if (hasProfileFields) {
      // Construire dynamiquement la requête UPDATE avec les champs fournis
      const fieldsToUpdate = [];
      const values = [];
      let paramIndex = 1;

      if (username !== undefined) {
        fieldsToUpdate.push(`username = $${paramIndex++}`);
        values.push(username);
      }
      if (full_name !== undefined) {
        fieldsToUpdate.push(`full_name = $${paramIndex++}`);
        values.push(full_name);
      }
      if (role !== undefined) {
        fieldsToUpdate.push(`role = $${paramIndex++}`);
        values.push(role);

        // Synchroniser role_id avec role (texte)
        const roleIdResult = await client.query('SELECT id FROM roles WHERE name = $1', [role]);
        if (roleIdResult.rows.length > 0) {
          fieldsToUpdate.push(`role_id = $${paramIndex++}`);
          values.push(roleIdResult.rows[0].id);
        }
      }
      if (password !== undefined) {
        const hashedPassword = await bcrypt.hash(password, 10);
        fieldsToUpdate.push(`password = $${paramIndex++}`);
        values.push(hashedPassword);
      }

      // Ajouter l'ID comme dernier paramètre
      values.push(id);

      const query = `UPDATE profiles SET ${fieldsToUpdate.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, full_name, role, created_at`;
      await client.query(query, values);
    }

    // Mettre à jour les segments si fournis
    if (segment_ids !== undefined) {
      await client.query('DELETE FROM professor_segments WHERE professor_id = $1', [id]);
      if (segment_ids.length > 0) {
        for (const segmentId of segment_ids) {
          await client.query(
            'INSERT INTO professor_segments (professor_id, segment_id) VALUES ($1, $2)',
            [id, segmentId]
          );
        }
      }
    }

    // Mettre à jour les villes si fournies
    if (city_ids !== undefined) {
      await client.query('DELETE FROM professor_cities WHERE professor_id = $1', [id]);
      if (city_ids.length > 0) {
        for (const cityId of city_ids) {
          await client.query(
            'INSERT INTO professor_cities (professor_id, city_id) VALUES ($1, $2)',
            [id, cityId]
          );
        }
      }
    }

    // Récupérer le profil complet avec les segments et villes
    const profileResult = await client.query(
      'SELECT id, username, full_name, role, created_at FROM profiles WHERE id = $1',
      [id]
    );

    const profile = profileResult.rows[0];

    // Ajouter les segment_ids
    const segmentsResult = await client.query(
      'SELECT segment_id FROM professor_segments WHERE professor_id = $1',
      [id]
    );
    profile.segment_ids = segmentsResult.rows.map(row => row.segment_id);

    // Ajouter les city_ids
    const citiesResult = await client.query(
      'SELECT city_id FROM professor_cities WHERE professor_id = $1',
      [id]
    );
    profile.city_ids = citiesResult.rows.map(row => row.city_id);

    await client.query('COMMIT');
    res.json(profile);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating profile:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE supprimer un profil
 * Protected: Requires authentication and users delete permission
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('accounting.users.delete'),
  async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM profiles WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
