/**
 * Analytics Migration - Create analytics tables in SiteIntern Railway database
 * 
 * This migration creates tables to track:
 * - Page views
 * - Student activity
 * - Formation views
 */

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.post('/run', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🔧 Creating analytics tables...');

        // 1. Page views tracking
        console.log('  - Creating analytics_pageviews table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_pageviews (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
        page_url VARCHAR(500) NOT NULL,
        page_title VARCHAR(255),
        referrer VARCHAR(500),
        ip_address VARCHAR(45),
        user_agent TEXT,
        session_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_pageviews_profile ON analytics_pageviews(profile_id);
      CREATE INDEX IF NOT EXISTS idx_pageviews_created ON analytics_pageviews(created_at);
      CREATE INDEX IF NOT EXISTS idx_pageviews_page ON analytics_pageviews(page_url);
    `);

        // 2. Student activity tracking
        console.log('  - Creating analytics_student_activity table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_student_activity (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        formation_id INTEGER REFERENCES formations(id) ON DELETE SET NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_activity_student ON analytics_student_activity(student_id);
      CREATE INDEX IF NOT EXISTS idx_activity_type ON analytics_student_activity(activity_type);
      CREATE INDEX IF NOT EXISTS idx_activity_created ON analytics_student_activity(created_at);
      CREATE INDEX IF NOT EXISTS idx_activity_formation ON analytics_student_activity(formation_id);
    `);

        // 3. Formation views tracking
        console.log('  - Creating analytics_formation_views table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_formation_views (
        id SERIAL PRIMARY KEY,
        formation_id INTEGER REFERENCES formations(id) ON DELETE CASCADE,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
        ip_address VARCHAR(45),
        referrer VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_formation_views_formation ON analytics_formation_views(formation_id);
      CREATE INDEX IF NOT EXISTS idx_formation_views_profile ON analytics_formation_views(profile_id);
      CREATE INDEX IF NOT EXISTS idx_formation_views_created ON analytics_formation_views(created_at);
    `);

        // 4. Registration source tracking
        console.log('  - Creating analytics_registration_sources table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_registration_sources (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        source VARCHAR(50) NOT NULL,  -- 'external_website', 'internal_system'
        referrer VARCHAR(500),
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_reg_sources_student ON analytics_registration_sources(student_id);
      CREATE INDEX IF NOT EXISTS idx_reg_sources_source ON analytics_registration_sources(source);
      CREATE INDEX IF NOT EXISTS idx_reg_sources_created ON analytics_registration_sources(created_at);
    `);

        await client.query('COMMIT');

        console.log('✅ Analytics tables created successfully!');

        res.json({
            success: true,
            message: 'Analytics tables created successfully',
            tables: [
                'analytics_pageviews',
                'analytics_student_activity',
                'analytics_formation_views',
                'analytics_registration_sources'
            ]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        client.release();
    }
});

// Endpoint to check if analytics tables exist
router.get('/status', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'analytics_%'
      ORDER BY table_name
    `);

        const tables = result.rows.map(row => row.table_name);
        const expectedTables = [
            'analytics_pageviews',
            'analytics_student_activity',
            'analytics_formation_views',
            'analytics_registration_sources'
        ];

        const allExist = expectedTables.every(table => tables.includes(table));

        res.json({
            success: true,
            tables_exist: tables,
            all_tables_created: allExist,
            missing_tables: expectedTables.filter(table => !tables.includes(table))
        });

    } catch (error) {
        console.error('Error checking analytics tables:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
