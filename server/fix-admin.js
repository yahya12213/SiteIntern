import bcrypt from 'bcryptjs';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function fixAdmin() {
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    console.log('New Hash for admin123:', hash);

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        // Update the existing admin user with the correct hash
        const res = await client.query(
            "UPDATE profiles SET password = $1 WHERE username = 'admin' RETURNING username",
            [hash]
        );

        if (res.rowCount > 0) {
            console.log('✅ Updated admin password hash in database.');
        } else {
            console.log('❌ Admin user not found in database. Creating now...');
            await client.query(
                "INSERT INTO profiles (username, password, full_name, role) VALUES ('admin', $1, 'Administrateur', 'admin')",
                [hash]
            );
            console.log('✅ Created admin user with verified hash.');
        }
    } catch (err) {
        console.error('❌ Error updating admin:', err.message);
    } finally {
        await client.end();
    }
}

fixAdmin();
