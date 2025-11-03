import express from 'express';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/run-migrations
 * Execute pending migrations (temporary endpoint for Railway deployment)
 * IMPORTANT: This endpoint should be removed after migrations are complete
 */
router.get('/', async (req, res) => {
  try {
    const results = [];

    // Migration 007: Add background columns to certificate_templates
    console.log('Running migration 007...');
    try {
      await pool.query(`
        ALTER TABLE certificate_templates
        ADD COLUMN IF NOT EXISTS background_image_url TEXT,
        ADD COLUMN IF NOT EXISTS background_image_type VARCHAR(10) DEFAULT 'url';
      `);
      results.push({ migration: '007_add_background_to_templates', status: 'success' });
      console.log('✅ Migration 007 completed');
    } catch (error) {
      results.push({ migration: '007_add_background_to_templates', status: 'error', error: error.message });
      console.error('❌ Migration 007 failed:', error.message);
    }

    // Migration 008: Create custom_fonts table
    console.log('Running migration 008...');
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS custom_fonts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL UNIQUE,
          file_url TEXT NOT NULL,
          file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('ttf', 'otf', 'woff', 'woff2')),
          file_size INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_custom_fonts_name ON custom_fonts(name);
      `);

      results.push({ migration: '008_create_custom_fonts', status: 'success' });
      console.log('✅ Migration 008 completed');
    } catch (error) {
      results.push({ migration: '008_create_custom_fonts', status: 'error', error: error.message });
      console.error('❌ Migration 008 failed:', error.message);
    }

    // Check if all migrations succeeded
    const allSuccess = results.every(r => r.status === 'success');

    res.json({
      success: allSuccess,
      message: allSuccess ? 'All migrations completed successfully' : 'Some migrations failed',
      results,
      note: 'IMPORTANT: Remove this endpoint after migrations are complete'
    });
  } catch (error) {
    console.error('Error running migrations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to run migrations'
    });
  }
});

export default router;
