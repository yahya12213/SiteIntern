import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * Setup endpoint to create progress tracking tables
 * GET /api/setup-progress/run-setup
 */
router.get('/run-setup', async (req, res) => {
  try {
    console.log('🔧 Starting progress tracking tables setup...');

    // Create video_progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        video_id UUID NOT NULL REFERENCES module_videos(id) ON DELETE CASCADE,
        last_watched_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, video_id)
      )
    `);
    console.log('✅ video_progress table created');

    // Create test_attempts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        test_id UUID NOT NULL REFERENCES module_tests(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        total_points INTEGER NOT NULL,
        passed BOOLEAN DEFAULT FALSE,
        answers JSONB DEFAULT '{}'::jsonb,
        completed_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ test_attempts table created');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_progress_student
      ON video_progress(student_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_progress_video
      ON video_progress(video_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_test_attempts_student
      ON test_attempts(student_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_test_attempts_test
      ON test_attempts(test_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_test_attempts_completed
      ON test_attempts(completed_at DESC)
    `);

    console.log('✅ Indexes created');

    console.log('🎉 Progress tracking setup complete!');

    res.json({
      success: true,
      message: 'Progress tracking tables created successfully',
      tables: ['video_progress', 'test_attempts'],
    });
  } catch (error) {
    console.error('❌ Error during progress setup:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: error.detail || 'No additional details',
    });
  }
});

export default router;
