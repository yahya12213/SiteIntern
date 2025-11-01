import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';

// Import routes
import segmentsRouter from './routes/segments.js';
import citiesRouter from './routes/cities.js';
import profilesRouter from './routes/profiles.js';
import calculationSheetsRouter from './routes/calculationSheets.js';
import declarationsRouter from './routes/declarations.js';
import authRouter from './routes/auth.js';
import setupTempRouter from './routes/setup-temp.js';
import adminRouter from './routes/admin.js';
import formationsRouter from './routes/formations.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/cities', citiesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/calculation-sheets', calculationSheetsRouter);
app.use('/api/declarations', declarationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/formations', formationsRouter);
app.use('/api/setup-temp', setupTempRouter); // TEMPORARY - Remove after database setup!

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'Connected' });
  } catch (error) {
    res.status(500).json({ status: 'Error', database: 'Disconnected', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
