import express from 'express';
import pg from 'pg';
const { Pool } = pg;

const router = express.Router();

router.post('/run', async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Starting migration 108: HR Overtime Periods...');

    // Create hr_overtime_periods table for manager declarations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hr_overtime_periods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        declared_by UUID,
        period_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        department_id UUID,
        reason TEXT,
        rate_type VARCHAR(20) DEFAULT 'normal' CHECK (rate_type IN ('normal', 'extended', 'special')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Created hr_overtime_periods table');

    // Create index for faster lookups by date
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_overtime_periods_date
      ON hr_overtime_periods(period_date)
    `);
    console.log('Created index on period_date');

    // Create index for department filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_overtime_periods_department
      ON hr_overtime_periods(department_id) WHERE department_id IS NOT NULL
    `);
    console.log('Created index on department_id');

    // Add period_id column to hr_overtime_records if not exists
    const columnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'hr_overtime_records' AND column_name = 'period_id'
    `);

    if (columnCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE hr_overtime_records
        ADD COLUMN period_id UUID REFERENCES hr_overtime_periods(id) ON DELETE SET NULL
      `);
      console.log('Added period_id column to hr_overtime_records');
    }

    // Create unique constraint to prevent duplicate entries per employee/date/period
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_overtime_records_unique
      ON hr_overtime_records(employee_id, overtime_date, period_id)
      WHERE period_id IS NOT NULL
    `);
    console.log('Created unique index for overtime records');

    // Create hr_overtime_config table for global settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hr_overtime_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        daily_threshold_hours DECIMAL(4,2) DEFAULT 8.00,
        weekly_threshold_hours DECIMAL(5,2) DEFAULT 44.00,
        monthly_max_hours DECIMAL(5,2) DEFAULT 40.00,
        rate_25_multiplier DECIMAL(3,2) DEFAULT 1.25,
        rate_50_multiplier DECIMAL(3,2) DEFAULT 1.50,
        rate_100_multiplier DECIMAL(3,2) DEFAULT 2.00,
        rate_25_threshold_hours DECIMAL(4,2) DEFAULT 8.00,
        rate_50_threshold_hours DECIMAL(4,2) DEFAULT 16.00,
        night_start TIME DEFAULT '21:00',
        night_end TIME DEFAULT '06:00',
        apply_100_for_night BOOLEAN DEFAULT true,
        apply_100_for_weekend BOOLEAN DEFAULT true,
        apply_100_for_holiday BOOLEAN DEFAULT true,
        requires_prior_approval BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('Created hr_overtime_config table');

    // Insert default config if not exists
    const configExists = await pool.query(`SELECT id FROM hr_overtime_config LIMIT 1`);
    if (configExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO hr_overtime_config (
          daily_threshold_hours, weekly_threshold_hours, monthly_max_hours,
          rate_25_multiplier, rate_50_multiplier, rate_100_multiplier,
          rate_25_threshold_hours, rate_50_threshold_hours,
          night_start, night_end
        ) VALUES (8.00, 44.00, 40.00, 1.25, 1.50, 2.00, 8.00, 16.00, '21:00', '06:00')
      `);
      console.log('Inserted default overtime config');
    }

    res.json({
      success: true,
      message: 'Migration 108 completed: HR Overtime Periods tables created'
    });

  } catch (error) {
    console.error('Migration 108 error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.detail || error.hint
    });
  } finally {
    await pool.end();
  }
});

export default router;
