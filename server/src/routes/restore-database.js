import express from 'express';
import pool from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * Super powerful route to restore the database from railway_backup.sql
 * USE WITH CAUTION - This will recreate tables and functions.
 */
router.post('/restore-full-backup', async (req, res) => {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Full Database Restoration from railway_backup.sql...');

        // Path to the backup file in the root directory
        const backupPath = join(__dirname, '../../../railway_backup.sql');

        if (!readFileSync(backupPath)) {
            throw new Error('railway_backup.sql not found in project root');
        }

        const sql = readFileSync(backupPath, 'utf8');

        await client.query('BEGIN');

        // Split the SQL file into separate statements to avoid issues with some PG drivers,
        // but carefully. Since it's a pg_dump, we might just try to run it in one go first.
        // However, 10MB can be large. 

        console.log('📦 Executing SQL Restoration (this may take a minute)...');

        // We attempt to run the whole SQL block. 
        // Note: If some SET commands or OWNER TO fail, we might need a more granular approach.
        await client.query(sql);

        await client.query('COMMIT');
        console.log('✅ Full Database Restoration Successful!');

        // Get count of tables to verify
        const tables = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        res.json({
            success: true,
            message: 'Full database restoration successful!',
            table_count: tables.rows[0].table_count
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Restoration Failed:', error);
        res.status(500).json({
            success: false,
            message: 'Restoration failed',
            error: error.message,
            stack: error.stack
        });
    } finally {
        if (client) client.release();
    }
});

export default router;
