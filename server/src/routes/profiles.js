import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// GET tous les profils (sans mots de passe)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, full_name, role, created_at
      FROM profiles
      ORDER BY full_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET un profil avec ses segments et villes
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Profil
    const profileResult = await pool.query(
      'SELECT id, username, full_name, role, created_at FROM profiles WHERE id = $1',
      [id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
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

// POST créer un profil
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id, username, password, full_name, role, segment_ids, city_ids } = req.body;

    if (!id || !username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
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

// PUT mettre à jour un profil (support des mises à jour partielles)
router.put('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { username, full_name, role, segment_ids, city_ids, password } = req.body;

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

// DELETE supprimer un profil
router.delete('/:id', async (req, res) => {
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
