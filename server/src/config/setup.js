import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const setupDatabase = async () => {
  // Connexion au serveur PostgreSQL (pas à la BDD spécifique)
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres', // Connexion à la DB par défaut
  });

  try {
    await client.connect();
    console.log('📦 Setting up database...');

    // Créer la base de données si elle n'existe pas
    const dbName = process.env.DB_NAME || 'accounting_db';

    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`;
    const result = await client.query(checkDbQuery);

    if (result.rows.length === 0) {
      console.log(`Creating database "${dbName}"...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database "${dbName}" created`);
    } else {
      console.log(`Database "${dbName}" already exists`);
    }

    await client.end();

    // Connexion à la nouvelle base de données
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: dbName,
    });

    await dbClient.connect();
    console.log('Creating tables...');

    // Schéma complet
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

      -- Table des sessions de formation
      CREATE TABLE IF NOT EXISTS formation_sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        instructor_id TEXT,
        max_capacity INTEGER,
        status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'active', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE SET NULL
      );

      -- Table des inscriptions aux sessions de formation
      CREATE TABLE IF NOT EXISTS formation_enrollments (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'enrolled' CHECK(status IN ('enrolled', 'completed', 'dropped')),
        notes TEXT,
        FOREIGN KEY (session_id) REFERENCES formation_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
        UNIQUE(session_id, student_id)
      );

      -- Insérer un admin par défaut
      INSERT INTO profiles (id, username, password, full_name, role)
      VALUES ('admin_1', 'admin', '$2a$10$XQZ9cKZJ6rPzN.z5w5vZDeH8YnZ1vQxZJ7XZ7qJzN1vQxZJ7XZ7qJ', 'Administrateur', 'admin')
      ON CONFLICT (username) DO NOTHING;
    `;

    await dbClient.query(schema);
    console.log('✅ Tables created successfully');

    await dbClient.end();
    console.log('✅ Database setup complete!');
    console.log('\n📝 Default admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
};

setupDatabase();
