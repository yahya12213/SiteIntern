import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try multiple .env locations
const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env'),
    path.join(process.cwd(), 'server', '.env')
];

for (const p of envPaths) {
    if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        console.log('✅ Loaded .env from:', p);
        break;
    }
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function getData() {
    try {
        console.log('--- USERS (PROFILES) ---');
        const profiles = await pool.query('SELECT username, role, full_name FROM profiles LIMIT 10');
        if (profiles.rows.length === 0) {
            console.log('No profiles found.');
        } else {
            console.table(profiles.rows);
        }

        console.log('\n--- STUDENTS (CIN LOGIN) ---');
        const students = await pool.query('SELECT cin, email, prenom, nom FROM students LIMIT 10');
        if (students.rows.length === 0) {
            console.log('No students found.');
        } else {
            console.table(students.rows);
        }

        console.log('\n--- HOW TO LOG IN ---');
        console.log('1. For Admins/Staff: Use username from Profiles table.');
        console.log('2. For Students: Use CIN (uppercase) as username.');
        console.log('3. Password: You must know the password or reset it.');

    } catch (err) {
        console.error('❌ Error fetching data:', err.message);
    } finally {
        await pool.end();
    }
}

getData();
