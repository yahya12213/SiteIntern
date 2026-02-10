import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const data = {
    segments: [
        { name: 'Diray', color: '#13ae66' },
        { name: 'Prolean', color: '#e09410' },
        { name: 'Industrie', color: '#3b82f6' }
    ],
    cities: [
        { name: 'Casablanca', code: 'CAS', segment: 'Prolean' },
        { name: 'Tanger', code: 'TAN', segment: 'Prolean' },
        { name: 'Rabat', code: 'RAB', segment: 'Diray' },
        { name: 'Marrakech', code: 'MAR', segment: 'Diray' },
        { name: 'Fes', code: 'FES', segment: 'Industrie' }
    ],
    profiles: [
        { username: 'admin', full_name: 'Administrateur', role: 'admin', pass: 'admin123' },
        { username: 'khalidfathi', full_name: 'Khalid Fathi', role: 'professor', pass: 'khalidfathi' },
        { username: 'gerant_nord', full_name: 'Gérant Zone Nord', role: 'gerant', pass: 'gerant123' }
    ],
    formations: [
        { title: 'Excel Avancé & VBA', desc: 'Macros, programmation VBA et analyse de données.', level: 'avance', price: 1500 },
        { title: 'Soft Skills & Leadership', desc: 'Gestion d\'équipe et communication efficace.', level: 'intermediaire', price: 1200 },
        { title: 'Introduction à la Comptabilité', desc: 'Bases de la comptabilité générale.', level: 'debutant', price: 800 }
    ]
};

async function seedFull() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗 Connecting to Railway...');
        await client.connect();

        console.log('🧹 Purging old data...');
        await client.query('TRUNCATE profiles, segments, cities, formations, formation_sessions, formation_modules CASCADE');

        console.log('👤 Seeding Profiles...');
        const salt = await bcrypt.genSalt(10);
        const profileIds = {};
        for (const p of data.profiles) {
            const hash = await bcrypt.hash(p.pass, salt);
            const res = await client.query(
                'INSERT INTO profiles (username, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
                [p.username, hash, p.full_name, p.role]
            );
            profileIds[p.username] = res.rows[0].id;
        }

        console.log('📁 Seeding Segments...');
        const segmentIds = {};
        for (const s of data.segments) {
            const res = await client.query('INSERT INTO segments (name, color) VALUES ($1, $2) RETURNING id', [s.name, s.color]);
            segmentIds[s.name] = res.rows[0].id;
        }

        console.log('🏙️ Seeding Cities...');
        const cityIds = {};
        for (const c of data.cities) {
            const res = await client.query(
                'INSERT INTO cities (name, code, segment_id) VALUES ($1, $2, $3) RETURNING id',
                [c.name, c.code, segmentIds[c.segment]]
            );
            cityIds[c.name] = res.rows[0].id;
        }

        console.log('🎓 Seeding Formations...');
        const formationIds = {};
        for (const f of data.formations) {
            const res = await client.query(
                'INSERT INTO formations (title, description, price, level, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [f.title, f.desc, f.price, f.level, 'published']
            );
            formationIds[f.title] = res.rows[0].id;
        }

        console.log('📅 Seeding Sessions...');
        await client.query(`
      INSERT INTO formation_sessions (name, formation_id, start_date, end_date, instructor_id, city_id, segment_id, status) VALUES
      ('Session Excel - Casa', $1, '2026-03-01', '2026-03-05', $2, $3, $4, 'planned'),
      ('Leadership - Rabat', $5, '2026-03-10', '2026-03-12', $2, $6, $7, 'planned')
    `, [
            formationIds['Excel Avancé & VBA'],
            profileIds['khalidfathi'],
            cityIds['Casablanca'],
            segmentIds['Prolean'],
            formationIds['Soft Skills & Leadership'],
            cityIds['Rabat'],
            segmentIds['Diray']
        ]);

        console.log('🧩 Seeding Modules...');
        const excelId = formationIds['Excel Avancé & VBA'];
        await client.query(`
      INSERT INTO formation_modules (formation_id, title, order_index, module_type) VALUES
      ($1, 'Module 1: Les Macros', 1, 'video'),
      ($1, 'Module 2: Tableaux Croisés', 2, 'video'),
      ($1, 'Examen Final', 3, 'test')
    `, [excelId]);

        console.log('✅ FULL SEED COMPLETED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ ERROR DURING SEEDING:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await client.end();
    }
}

seedFull();
