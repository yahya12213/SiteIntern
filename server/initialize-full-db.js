import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded .env');
}

const initializeFullDatabase = async () => {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not defined in .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('📦 Connected to Railway database for full setup...');

        const schema = `
      -- 1. Profiles
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'professor', 'gerant')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Segments
      CREATE TABLE IF NOT EXISTS segments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Cities
      CREATE TABLE IF NOT EXISTS cities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. professor_segments
      CREATE TABLE IF NOT EXISTS professor_segments (
        professor_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
        PRIMARY KEY (professor_id, segment_id)
      );

      -- 5. professor_cities
      CREATE TABLE IF NOT EXISTS professor_cities (
        professor_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
        PRIMARY KEY (professor_id, city_id)
      );

      -- 6. calculation_sheets
      CREATE TABLE IF NOT EXISTS calculation_sheets (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        template_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
        sheet_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 7. calculation_sheet_segments
      CREATE TABLE IF NOT EXISTS calculation_sheet_segments (
        sheet_id INTEGER NOT NULL REFERENCES calculation_sheets(id) ON DELETE CASCADE,
        segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
        PRIMARY KEY (sheet_id, segment_id)
      );

      -- 8. calculation_sheet_cities
      CREATE TABLE IF NOT EXISTS calculation_sheet_cities (
        sheet_id INTEGER NOT NULL REFERENCES calculation_sheets(id) ON DELETE CASCADE,
        city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
        PRIMARY KEY (sheet_id, city_id)
      );

      -- 9. professor_declarations
      CREATE TABLE IF NOT EXISTS professor_declarations (
        id SERIAL PRIMARY KEY,
        professor_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        calculation_sheet_id INTEGER NOT NULL REFERENCES calculation_sheets(id) ON DELETE CASCADE,
        segment_id INTEGER NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
        city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        form_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'brouillon' CHECK(status IN ('brouillon', 'soumise', 'en_cours', 'approuvee', 'refusee', 'a_declarer')),
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP,
        reviewed_at TIMESTAMP
      );

      -- 10. Formations
      CREATE TABLE IF NOT EXISTS formations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10, 2),
        duration_hours INTEGER,
        level TEXT CHECK(level IN ('debutant', 'intermediaire', 'avance')),
        thumbnail_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
        passing_score_percentage INTEGER DEFAULT 80,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. formation_sessions
      CREATE TABLE IF NOT EXISTS formation_sessions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        formation_id INTEGER REFERENCES formations(id) ON DELETE SET NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        segment_id INTEGER REFERENCES segments(id) ON DELETE SET NULL,
        city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
        instructor_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
        max_capacity INTEGER,
        status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'active', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 12. formation_enrollments
      CREATE TABLE IF NOT EXISTS formation_enrollments (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES formation_sessions(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'enrolled' CHECK(status IN ('enrolled', 'completed', 'dropped')),
        notes TEXT,
        UNIQUE(session_id, student_id)
      );

      -- 13. formation_modules
      CREATE TABLE IF NOT EXISTS formation_modules (
        id SERIAL PRIMARY KEY,
        formation_id INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        order_index INTEGER NOT NULL,
        prerequisite_module_id INTEGER REFERENCES formation_modules(id) ON DELETE SET NULL,
        module_type TEXT NOT NULL CHECK(module_type IN ('video', 'test', 'document')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 14. module_videos
      CREATE TABLE IF NOT EXISTS module_videos (
        id SERIAL PRIMARY KEY,
        module_id INTEGER NOT NULL REFERENCES formation_modules(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        youtube_url TEXT NOT NULL,
        duration_seconds INTEGER,
        description TEXT,
        order_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 15. module_tests
      CREATE TABLE IF NOT EXISTS module_tests (
        id SERIAL PRIMARY KEY,
        module_id INTEGER NOT NULL REFERENCES formation_modules(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        passing_score INTEGER DEFAULT 80,
        time_limit_minutes INTEGER,
        max_attempts INTEGER,
        show_correct_answers BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Default Admin (Password: admin123)
      INSERT INTO profiles (username, password, full_name, role)
      VALUES ('admin', '$2a$10$XQZ9cKZJ6rPzN.z5w5vZDeH8YnZ1vQxZJ7XZ7qJzN1vQxZJ7XZ7qJ', 'Administrateur', 'admin')
      ON CONFLICT (username) DO NOTHING;
    `;

        await client.query(schema);
        console.log('✅ ALL tables created successfully!');

    } catch (error) {
        console.error('❌ Error during full initialization:', error.message);
    } finally {
        await client.end();
    }
};

initializeFullDatabase();
