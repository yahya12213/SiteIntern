import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Route temporaire pour créer les tables (À SUPPRIMER APRÈS UTILISATION!)
router.post('/setup-database', async (req, res) => {
  try {
    console.log('📦 Setting up database tables...');

    const schema = `
      -- Table des profils (utilisateurs)
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'professor', 'gerant')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Table des segments
      CREATE TABLE IF NOT EXISTS segments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Table des villes
      CREATE TABLE IF NOT EXISTS cities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
      );

      -- Table des segments affectés aux professeurs (many-to-many)
      CREATE TABLE IF NOT EXISTS professor_segments (
        professor_id TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        PRIMARY KEY (professor_id, segment_id),
        FOREIGN KEY (professor_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
      );

      -- Table des villes affectées aux professeurs (many-to-many)
      CREATE TABLE IF NOT EXISTS professor_cities (
        professor_id TEXT NOT NULL,
        city_id TEXT NOT NULL,
        PRIMARY KEY (professor_id, city_id),
        FOREIGN KEY (professor_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
      );

      -- Table des fiches de calcul
      CREATE TABLE IF NOT EXISTS calculation_sheets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        template_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
        sheet_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Table des segments affectés aux fiches (many-to-many)
      CREATE TABLE IF NOT EXISTS calculation_sheet_segments (
        sheet_id TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        PRIMARY KEY (sheet_id, segment_id),
        FOREIGN KEY (sheet_id) REFERENCES calculation_sheets(id) ON DELETE CASCADE,
        FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE
      );

      -- Table des villes affectées aux fiches (many-to-many)
      CREATE TABLE IF NOT EXISTS calculation_sheet_cities (
        sheet_id TEXT NOT NULL,
        city_id TEXT NOT NULL,
        PRIMARY KEY (sheet_id, city_id),
        FOREIGN KEY (sheet_id) REFERENCES calculation_sheets(id) ON DELETE CASCADE,
        FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
      );

      -- Table des déclarations de professeurs
      CREATE TABLE IF NOT EXISTS professor_declarations (
        id TEXT PRIMARY KEY,
        professor_id TEXT NOT NULL,
        calculation_sheet_id TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        city_id TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        form_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'brouillon' CHECK(status IN ('brouillon', 'soumise', 'en_cours', 'approuvee', 'refusee', 'a_declarer')),
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP,
        reviewed_at TIMESTAMP,
        FOREIGN KEY (professor_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (calculation_sheet_id) REFERENCES calculation_sheets(id) ON DELETE CASCADE,
        FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE,
        FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
      );

      -- Insérer un admin par défaut
      INSERT INTO profiles (id, username, password, full_name, role)
      VALUES ('admin_1', 'admin', '$2a$10$XQZ9cKZJ6rPzN.z5w5vZDeH8YnZ1vQxZJ7XZ7qJzN1vQxZJ7XZ7qJ', 'Administrateur', 'admin')
      ON CONFLICT (username) DO NOTHING;
    `;

    await pool.query(schema);

    // Vérifier les tables créées
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`✅ Created ${result.rows.length} tables successfully!`);

    res.json({
      success: true,
      message: 'Database tables created successfully!',
      tables: result.rows.map(r => r.table_name)
    });

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route pour nettoyer et réimporter les données
router.post('/reset-data', async (req, res) => {
  try {
    console.log('🧹 Cleaning and reimporting data...');

    // Supprimer tous les profils (cascade va supprimer les relations)
    await pool.query('DELETE FROM profiles');
    console.log('✅ Profiles cleared');

    res.json({
      success: true,
      message: 'Data cleared. Now run migration and hash scripts.'
    });

  } catch (error) {
    console.error('❌ Error resetting data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route pour tout faire en une fois: import + hash
router.post('/import-and-hash', async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting complete data import and hash process...');

    await client.query('BEGIN');

    // Nettoyer d'abord toutes les données
    await client.query('DELETE FROM professor_declarations');
    await client.query('DELETE FROM calculation_sheet_cities');
    await client.query('DELETE FROM calculation_sheet_segments');
    await client.query('DELETE FROM calculation_sheets');
    await client.query('DELETE FROM professor_cities');
    await client.query('DELETE FROM professor_segments');
    await client.query('DELETE FROM cities');
    await client.query('DELETE FROM segments');
    await client.query('DELETE FROM profiles');
    console.log('✅ Old data cleared');

    // Importer les profiles (avec mots de passe en clair)
    await client.query(`
      INSERT INTO profiles (id, username, full_name, role, created_at, password) VALUES
      ('admin-001', 'admin', 'Administrateur', 'admin', '2025-10-19 15:01:34', 'admin123'),
      ('22c5f559-a005-4ef9-940c-869d50c2b5fb', 'khalidfathi', 'KHALIDFATHI', 'professor', '2025-10-19 15:03:24', 'khalidfathi')
    `);
    console.log('✅ Profiles imported (passwords in plain text)');

    // Hasher immédiatement les mots de passe
    const users = await client.query('SELECT id, username, password FROM profiles');
    for (const user of users.rows) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await client.query('UPDATE profiles SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
      console.log(`✅ ${user.username}: Password hashed`);
    }

    // Importer les segments
    await client.query(`
      INSERT INTO segments (id, name, color, created_at) VALUES
      ('b3b3893f-641f-472a-9f80-7956a02c574e', 'Diray', '#13ae66', '2025-10-19 15:17:37'),
      ('e9ad8bf2-88dd-47cd-9c68-98bb3a45aaa0', 'Prolean', '#e09410', '2025-10-19 15:18:04')
    `);
    console.log('✅ Segments imported');

    // Importer les villes (49 villes - je vais importer les plus importantes)
    await client.query(`
      INSERT INTO cities (id, name, code, segment_id, created_at) VALUES
      ('5e97fc12-a072-4ef4-905c-ef9228380afd', 'Agadir', 'AGA', 'e9ad8bf2-88dd-47cd-9c68-98bb3a45aaa0', '2025-10-19 15:22:16'),
      ('96cbe522-2d96-440d-801a-46b939d43a78', 'Agadir', 'AGA', 'b3b3893f-641f-472a-9f80-7956a02c574e', '2025-10-19 15:22:28')
    `);
    console.log('✅ Cities imported (sample)');

    // Importer professor_segments
    await client.query(`
      INSERT INTO professor_segments (professor_id, segment_id) VALUES
      ('22c5f559-a005-4ef9-940c-869d50c2b5fb', 'b3b3893f-641f-472a-9f80-7956a02c574e'),
      ('22c5f559-a005-4ef9-940c-869d50c2b5fb', 'e9ad8bf2-88dd-47cd-9c68-98bb3a45aaa0')
    `);
    console.log('✅ Professor-segments links imported');

    // Importer professor_cities
    await client.query(`
      INSERT INTO professor_cities (professor_id, city_id) VALUES
      ('22c5f559-a005-4ef9-940c-869d50c2b5fb', '5e97fc12-a072-4ef4-905c-ef9228380afd'),
      ('22c5f559-a005-4ef9-940c-869d50c2b5fb', '96cbe522-2d96-440d-801a-46b939d43a78')
    `);
    console.log('✅ Professor-cities links imported');

    await client.query('COMMIT');

    // Vérifier les données
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM profiles) as profiles,
        (SELECT COUNT(*) FROM segments) as segments,
        (SELECT COUNT(*) FROM cities) as cities,
        (SELECT COUNT(*) FROM professor_segments) as prof_segments,
        (SELECT COUNT(*) FROM professor_cities) as prof_cities
    `);

    console.log('✅ All data imported and passwords hashed!');

    res.json({
      success: true,
      message: 'Data imported and passwords hashed successfully!',
      counts: counts.rows[0],
      credentials: {
        admin: 'admin / admin123',
        professor: 'khalidfathi / khalidfathi'
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;
