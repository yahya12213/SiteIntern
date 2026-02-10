import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

dotenv.config();

const seedEverything = async () => {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not defined');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('📦 Connected to Railway for seeding...');

        // 1. CLEAR EXISTING DATA (Carefully)
        console.log('🧹 Cleaning existing data...');
        await client.query('TRUNCATE profiles, segments, cities, formations, formation_sessions CASCADE');

        // 2. SEED PROFILES
        console.log('👤 Seeding Profiles...');
        const salt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash('admin123', salt);
        const profHash = await bcrypt.hash('khalidfathi', salt);

        await client.query(\`
      INSERT INTO profiles (username, password, full_name, role) VALUES
      ('admin', '\${adminHash}', 'Administrateur', 'admin'),
      ('khalidfathi', '\${profHash}', 'Khalid Fathi', 'professor'),
      ('gerant_01', '\${adminHash}', 'Gérant Nord', 'gerant')
    \`);

    // 3. SEED SEGMENTS
    console.log('📁 Seeding Segments...');
    const segmentRes = await client.query(\`
      INSERT INTO segments (name, color) VALUES
      ('Diray', '#13ae66'),
      ('Prolean', '#e09410'),
      ('Industrie', '#3b82f6')
      RETURNING id, name
    \`);
    const segments = segmentRes.rows.reduce((acc, s) => ({ ...acc, [s.name]: s.id }), {});

    // 4. SEED CITIES
    console.log('🏙️ Seeding Cities...');
    await client.query(\`
      INSERT INTO cities (name, code, segment_id) VALUES
      ('Casablanca', 'CAS', \${segments['Prolean']}),
      ('Rabat', 'RAB', \${segments['Diray']}),
      ('Tanger', 'TAN', \${segments['Prolean']}),
      ('Marrakech', 'MAR', \${segments['Diray']}),
      ('Fes', 'FES', \${segments['Industrie']}),
      ('Agadir', 'AGA', \${segments['Prolean']})
    \`);

    // 5. SEED FORMATIONS
    console.log('🎓 Seeding Formations...');
    const formationRes = await client.query(\`
      INSERT INTO formations (title, description, price, duration_hours, level, status) VALUES
      ('Maîtrise Excel Avancé', 'Formation complète sur les macros, VBA et tableaux croisés dynamiques.', 1500, 20, 'avance', 'published'),
      ('Gestion de Projet Moderne', 'Apprenez Scrum, Kanban et les bases de la gestion de projet.', 2200, 35, 'intermediaire', 'published'),
      ('Communication Digitale', 'Stratégies réseaux sociaux et marketing de contenu.', 1200, 15, 'debutant', 'published')
      RETURNING id, title
    \`);
    const formations = formationRes.rows.reduce((acc, f) => ({ ...acc, [f.title]: f.id }), {});

    // 6. SEED SESSIONS
    console.log('📅 Seeding Sessions...');
    const profRes = await client.query("SELECT id FROM profiles WHERE username = 'khalidfathi'");
    const profId = profRes.rows[0].id;
    const cityRes = await client.query("SELECT id FROM cities WHERE name = 'Casablanca'");
    const casaId = cityRes.rows[0].id;

    await client.query(\`
      INSERT INTO formation_sessions (name, formation_id, start_date, end_date, instructor_id, city_id, segment_id, status) VALUES
      ('Session Excel - Casa Février', \${formations['Maîtrise Excel Avancé']}, '2026-02-15', '2026-02-20', \${profId}, \${casaId}, \${segments['Prolean']}, 'planned'),
      ('Session Management - Rabat Mars', \${formations['Gestion de Projet Moderne']}, '2026-03-01', '2026-03-15', \${profId}, (SELECT id FROM cities WHERE name = 'Rabat'), \${segments['Diray']}, 'planned')
    \`);

    // 7. SEED MODULES
    console.log('🧩 Seeding Modules & Videos...');
    const excelId = formations['Maîtrise Excel Avancé'];
    const modRes = await client.query(\`
      INSERT INTO formation_modules (formation_id, title, order_index, module_type) VALUES
      (\${excelId}, 'Introduction aux Macros', 1, 'video'),
      (\${excelId}, 'Logic VBA Basics', 2, 'video'),
      (\${excelId}, 'Quiz Niveau 1', 3, 'test')
      RETURNING id, title
    \`);
    
    const introModId = modRes.rows.find(m => m.title === 'Introduction aux Macros').id;
    await client.query(\`
      INSERT INTO module_videos (module_id, title, youtube_url, order_index) VALUES
      (\${introModId}, 'Bienvenue dans Excel Avancé', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1)
    \`);

    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await client.end();
  }
};

seedEverything();
