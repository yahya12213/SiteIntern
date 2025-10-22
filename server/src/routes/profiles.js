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

// PUT mettre à jour un profil
router.put('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { username, full_name, role, segment_ids, city_ids, password } = req.body;

    await client.query('BEGIN');

    // Mettre à jour le profil
    let query, params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = 'UPDATE profiles SET username = $1, full_name = $2, role = $3, password = $4 WHERE id = $5 RETURNING id, username, full_name, role, created_at';
      params = [username, full_name, role, hashedPassword, id];
    } else {
      query = 'UPDATE profiles SET username = $1, full_name = $2, role = $3 WHERE id = $4 RETURNING id, username, full_name, role, created_at';
      params = [username, full_name, role, id];
    }

    const profileResult = await client.query(query, params);

    if (profileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = profileResult.rows[0];

    // Mettre à jour les segments
    await client.query('DELETE FROM professor_segments WHERE professor_id = $1', [id]);
    if (segment_ids && segment_ids.length > 0) {
      for (const segmentId of segment_ids) {
        await client.query(
          'INSERT INTO professor_segments (professor_id, segment_id) VALUES ($1, $2)',
          [id, segmentId]
        );
      }
      profile.segment_ids = segment_ids;
    }

    // Mettre à jour les villes
    await client.query('DELETE FROM professor_cities WHERE professor_id = $1', [id]);
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
